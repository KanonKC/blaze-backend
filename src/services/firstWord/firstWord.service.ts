import Configurations from "@/config/index";
import { TwitchChannelChatMessageEventRequest } from "@/events/twitch/channelChatMessage/request";
import { TwitchStreamOnlineEventRequest } from "@/events/twitch/streamOnline/request";
import s3 from "@/libs/awsS3";
import redis, { TTL, publisher } from "@/libs/redis";
import { createESTransport, twitchAppAPI } from "@/libs/twurple";
import TLogger, { Layer } from "@/logging/logger";
import FirstWordRepository from "@/repositories/firstWord/firstWord.repository";
import { UpdateFirstWord } from "@/repositories/firstWord/request";
import { FirstWordWidget } from "@/repositories/firstWord/response";
import UserRepository from "@/repositories/user/user.repository";
import { mapMessageVariables } from "@/utils/message";
import { randomBytes } from "crypto";
import { FirstWord, FirstWordChatter, User } from "generated/prisma/client";
import AuthService from "../auth/auth.service";
import { CreateFirstWordRequest } from "./request";
import { ForbiddenError, NotFoundError } from "@/errors";

export default class FirstWordService {
    private readonly cfg: Configurations
    private readonly firstWordRepository: FirstWordRepository;
    private readonly userRepository: UserRepository;
    private readonly authService: AuthService;
    private readonly logger = new TLogger(Layer.SERVICE);

    constructor(cfg: Configurations, firstWordRepository: FirstWordRepository, userRepository: UserRepository, authService: AuthService) {
        this.cfg = cfg;
        this.firstWordRepository = firstWordRepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    private authorize(userId: string, firstWord: FirstWordWidget): boolean {
        if (firstWord.widget.owner_id != userId) {
            this.logger.error({ message: "You are not the owner of this first word config", data: { userId, ownerId: firstWord.widget.owner_id } });
            throw new ForbiddenError("You are not the owner of this first word config")
        }
        return true
    }

    async create(request: CreateFirstWordRequest): Promise<FirstWordWidget> {
        this.logger.setContext("service.firstWord.create");
        const user = await this.userRepository.get(request.owner_id);
        if (!user) {
            this.logger.warn({ message: "User not found", data: { request } });
            throw new NotFoundError("User not found");
        }

        const userSubs = await twitchAppAPI.eventSub.getSubscriptionsForUser(user.twitch_id);
        this.logger.debug({ message: "userSubs", data: userSubs.data.map(e => ({ ...e })) });
        const enabledSubs = userSubs.data.filter(sub => sub.status === 'enabled')
        this.logger.debug({ message: "enabledSubs", data: enabledSubs.map(e => ({ ...e })) });

        const userChatMessageSub = enabledSubs.filter(sub => sub.type === 'channel.chat.message')
        this.logger.debug({ message: "userChatMessageSub", data: userChatMessageSub.map(e => ({ ...e })) });
        if (userChatMessageSub.length === 0) {
            const tsp = createESTransport("/webhook/v1/twitch/event-sub/channel-chat-message")
            await twitchAppAPI.eventSub.subscribeToChannelChatMessageEvents(user.twitch_id, tsp)
        }

        const streamOnlineSubs = enabledSubs.filter(sub => sub.type === 'stream.online')
        this.logger.debug({ message: "streamOnlineSubs", data: streamOnlineSubs.map(e => ({ ...e })) });
        if (streamOnlineSubs.length === 0) {
            const tsp = createESTransport("/webhook/v1/twitch/event-sub/stream-online")
            await twitchAppAPI.eventSub.subscribeToStreamOnlineEvents(user.twitch_id, tsp)
        }

        return this.firstWordRepository.create({
            ...request,
            reply_message: "สวัสดี {{user_name}} ยินดีต้อนรับเข้าสู่สตรีม!",
            twitch_bot_id: user.twitch_id,
            overlay_key: randomBytes(16).toString("hex"),
        });
    }

    async getByUserId(userId: string): Promise<FirstWordWidget> {
        this.logger.setContext("service.firstWord.getByUserId");
        const res = await this.firstWordRepository.getByOwnerId(userId)
        if (!res) {
            throw new NotFoundError("First word config not found")
        }
        this.authorize(userId, res)
        return res
    }

    async update(userId: string, data: UpdateFirstWord): Promise<FirstWordWidget> {
        this.logger.setContext("service.firstWord.update");
        const existing = await this.firstWordRepository.getByOwnerId(userId)
        if (!existing) {
            this.logger.error({ message: "First word config not found", data: { userId } });
            throw new NotFoundError("First word config not found")
        }
        this.authorize(userId, existing)
        const res = await this.firstWordRepository.update(existing.id, data)
        await redis.del(`first_word:owner_id:${userId}`)
        return res
    }

    // async uploadAudio(userId: string, file: { buffer: Buffer, filename: string, mimetype: string }): Promise<void> {
    //     this.logger.setContext("service.firstWord.uploadAudio");
    //     const firstWord = await this.firstWordRepository.getByOwnerId(userId)
    //     this.logger.debug({ message: "firstWord", data: firstWord });
    //     if (!firstWord) {
    //         this.logger.error({ message: "First word not found", data: { userId } });
    //         throw new NotFoundError("First word not found")
    //     }
    //     this.authorize(userId, firstWord)
    //     if (firstWord.audio_key) {
    //         await s3.deleteFile(firstWord.audio_key)
    //     }
    //     this.logger.debug({ message: "file", data: file });
    //     const audioKey = `first-word/${firstWord.id}/audio/${file.filename}`
    //     this.logger.debug({ message: "audioKey", data: audioKey });
    //     await s3.uploadFile(file.buffer, audioKey, file.mimetype)
    //     await this.firstWordRepository.update(firstWord.id, { audio_key: audioKey })
    //     await redis.del(`first_word:owner_id:${userId}`)
    // }

    async delete(userId: string): Promise<void> {
        this.logger.setContext("service.firstWord.delete");
        const firstWord = await this.firstWordRepository.getByOwnerId(userId);
        if (!firstWord) {
            return;
        }
        this.authorize(userId, firstWord)
        if (firstWord.audio_key) {
            try {
                await s3.deleteFile(firstWord.audio_key);
            } catch (error) {
                this.logger.error({ message: "Failed to delete audio file", error: error as Error });
                // Continue deletion even if S3 fails
            }
        }

        await this.firstWordRepository.delete(firstWord.id);

        // Clear caches
        await redis.del(`first_word:owner_id:${userId}`);
        await redis.del(`first_word:chatters:channel_id:${userId}`); // Assuming channel_id same as owner twitch_id logic elsewhere or close enough to clear
    }

    async refreshOverlayKey(userId: string): Promise<FirstWord> {
        this.logger.setContext("service.firstWord.refreshOverlayKey");
        const firstWord = await this.firstWordRepository.getByOwnerId(userId);
        if (!firstWord) {
            this.logger.error({ message: "First word config not found", data: { userId } });
            throw new NotFoundError("First word config not found");
        }
        this.authorize(userId, firstWord)

        const newKey = randomBytes(16).toString("hex");
        // TODO: Use widget repository
        const updated = await this.firstWordRepository.update(firstWord.id, { overlay_key: newKey });

        await redis.del(`first_word:owner_id:${userId}`);
        return updated;
    }

    async validateOverlayAccess(userId: string, key: string): Promise<boolean> {
        this.logger.setContext("service.firstWord.validateOverlayAccess");
        // We can use cache here for performance since this hits frequently on connection
        const firstWordCacheKey = `first_word:owner_id:${userId}`
        let firstWord: FirstWordWidget | null = null

        const firstWordCache = await redis.get(firstWordCacheKey)
        if (firstWordCache) {
            firstWord = JSON.parse(firstWordCache)
        } else {
            firstWord = await this.firstWordRepository.getByOwnerId(userId);
            if (firstWord) {
                redis.set(firstWordCacheKey, JSON.stringify(firstWord), TTL.TWO_HOURS)
            }
        }

        this.logger.debug({ message: "firstWord", data: firstWord });

        if (!firstWord) return false;
        this.authorize(userId, firstWord)

        this.logger.debug({ message: "firstWord validate", data: { overlay_key: firstWord.widget.overlay_key, key } });
        // Use constant time comparison if possible, but for UUIDs/strings here standard checks are okay 
        // as long as we handle missing keys.
        return firstWord.widget.overlay_key === key;
    }

    async greetNewChatter(e: TwitchChannelChatMessageEventRequest): Promise<void> {
        this.logger.setContext("service.firstWord.greetNewChatter");
        this.logger.info({ message: "Initiate greeting new chatter", data: { event: e } });
        let user: User | null = null
        const userCacheKey = `user:twitch_id:${e.broadcaster_user_id}`
        const userCache = await redis.get(userCacheKey)

        if (userCache) {
            user = JSON.parse(userCache)
        } else {
            user = await this.userRepository.getByTwitchId(e.broadcaster_user_id);
            if (user) {
                redis.set(userCacheKey, JSON.stringify(user), TTL.TWO_HOURS)
            }
        }

        if (!user) {
            this.logger.error({ message: "User not found", data: { event: e } });
            throw new NotFoundError("User not found");
        }

        this.logger.info({ message: "Found user", data: { user } });

        const firstWordCacheKey = `first_word:owner_id:${user.id}`
        const firstWordCache = await redis.get(firstWordCacheKey)
        let firstWord: FirstWordWidget | null = null

        if (firstWordCache) {
            firstWord = JSON.parse(firstWordCache)
        } else {
            firstWord = await this.firstWordRepository.getByOwnerId(user.id);
            if (firstWord) {
                redis.set(firstWordCacheKey, JSON.stringify(firstWord), TTL.TWO_HOURS)
            }
        }

        if (!firstWord) {
            this.logger.error({ message: "First word config not found", data: { user } });
            throw new NotFoundError("First word config not found");
        }

        this.logger.info({ message: "First word config found", data: { firstWord } });

        // Check if first word is enabled
        if (!firstWord.widget.enabled) {
            this.logger.info({ message: "First word is not enabled", data: { firstWord } });
            return
        }


        const senderId = firstWord.twitch_bot_id || this.cfg.twitch.defaultBotId

        // Check if user is bot itself
        if (e.chatter_user_id === senderId) {
            this.logger.info({ message: "User is bot itself", data: { firstWord } });
            return
        }

        let chatters: FirstWordChatter[] = []
        const chattersCacheKey = `first_word:chatters:channel_id:${e.broadcaster_user_id}`
        const chattersCache = await redis.get(chattersCacheKey)

        if (chattersCache) {
            chatters = JSON.parse(chattersCache)
        } else {
            chatters = await this.firstWordRepository.getChattersByChannelId(e.broadcaster_user_id);
            redis.set(chattersCacheKey, JSON.stringify(chatters), TTL.TWO_HOURS)
        }

        this.logger.info({ message: "Found chatters", data: { chatters } });
        const chatter = chatters.find(chatter => chatter.twitch_chatter_id === e.chatter_user_id)

        // Check if user is already greeted and not a test user
        if (chatter && e.chatter_user_id !== "0") {
            this.logger.info({ message: "User is already greeted", data: { chatter } });
            return
        }

        let message = firstWord.reply_message

        // If replay message does not empty -> Send message to Twitch
        if (message) {
            const replaceMap = {
                "{{user_name}}": e.chatter_user_name
            }
            message = mapMessageVariables(message, replaceMap)
            this.logger.debug({ message: "send chat message", data: { broadcaster_user_id: e.broadcaster_user_id, message } });
            this.logger.info({ message: "Sending chat message", data: { message } });
            await twitchAppAPI.chat.sendChatMessageAsApp(senderId, e.broadcaster_user_id, message)
        }

        // If audio key does not empty -> Send audio to overlay
        if (firstWord.audio_key) {
            this.logger.debug({ message: "audio_key", data: { audio_key: firstWord.audio_key } });
            const url = await s3.getSignedURL(firstWord.audio_key, { expiresIn: 3600 });
            this.logger.debug({ message: "url", data: { url } });
            this.logger.info({ message: "Sending audio to overlay", data: { url } });
            await publisher.publish("first-word-audio", JSON.stringify({
                userId: user.id,
                audioUrl: url
            }))
            this.logger.debug({ message: "published" });
        }

        // Add chatter to database if not test user to prevent duplicate greetings
        if (e.chatter_user_id !== "0") {
            this.logger.info({ message: "Adding chatter to database", data: { chatter: e.chatter_user_id } });
            try {

                await this.firstWordRepository.addChatter({
                    first_word_id: firstWord.id,
                    twitch_chatter_id: e.chatter_user_id,
                    twitch_channel_id: e.broadcaster_user_id,
                })
                chatters.push({
                    id: 0,
                    first_word_id: firstWord.id,
                    twitch_chatter_id: e.chatter_user_id,
                    twitch_channel_id: e.broadcaster_user_id,
                    created_at: new Date(),
                    updated_at: new Date()
                })
                redis.set(chattersCacheKey, JSON.stringify(chatters), TTL.TWO_HOURS)
            } catch (error) {
                this.logger.error({ message: "Failed to add chatter to database", error: error as Error });
            }
        }
    }

    async resetChatters(e: TwitchStreamOnlineEventRequest): Promise<void> {
        this.logger.setContext("service.firstWord.resetChatters");
        const user = await this.userRepository.getByTwitchId(e.broadcaster_user_id);
        if (!user) {
            this.logger.error({ message: "User not found", data: { event: e } });
            throw new NotFoundError("User not found");
        }

        const firstWord = await this.firstWordRepository.getByOwnerId(user.id);
        if (!firstWord) {
            this.logger.error({ message: "First word not found", data: { user } });
            throw new NotFoundError("First word not found");
        }

        await this.firstWordRepository.clearChatters(firstWord.id)
        redis.del(`first_word:chatters:channel_id:${e.broadcaster_user_id}`)
    }

    async clearCaches(): Promise<void> {
        this.logger.setContext("service.firstWord.clearCaches");
        const keys = await redis.keys("first_word:*")
        for (const key of keys) {
            await redis.del(key)
        }
    }
}