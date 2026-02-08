import Configurations from "@/config/index";
import { TwitchChannelChatMessageEventRequest } from "@/events/twitch/channelChatMessage/request";
import { TwitchStreamOnlineEventRequest } from "@/events/twitch/streamOnline/request";
import s3 from "@/libs/awsS3";
import redis, { TTL, publisher } from "@/libs/redis";
import { createESTransport, twitchAppAPI } from "@/libs/twurple";
import FirstWordRepository from "@/repositories/firstWord/firstWord.repository";
import { UpdateFirstWord } from "@/repositories/firstWord/request";
import { FirstWordWidget } from "@/repositories/firstWord/response";
import UserRepository from "@/repositories/user/user.repository";
import { mapMessageVariables } from "@/utils/message";
import { randomBytes } from "crypto";
import { FirstWord, FirstWordChatter, User } from "generated/prisma/client";
import AuthService from "../auth/auth.service";
import { CreateFirstWordRequest } from "./request";

export default class FirstWordService {
    private readonly cfg: Configurations
    private readonly firstWordRepository: FirstWordRepository;
    private readonly userRepository: UserRepository;
    private readonly authService: AuthService;

    constructor(cfg: Configurations, firstWordRepository: FirstWordRepository, userRepository: UserRepository, authService: AuthService) {
        this.cfg = cfg;
        this.firstWordRepository = firstWordRepository;
        this.userRepository = userRepository;
        this.authService = authService;
    }

    async create(request: CreateFirstWordRequest): Promise<FirstWordWidget> {
        const user = await this.userRepository.get(request.owner_id);
        if (!user) {
            throw new Error("User not found");
        }

        const userSubs = await twitchAppAPI.eventSub.getSubscriptionsForUser(user.twitch_id);
        console.log('userSubs', userSubs.data.map(e => ({ ...e })))
        const enabledSubs = userSubs.data.filter(sub => sub.status === 'enabled')
        console.log('enabledSubs', enabledSubs.map(e => ({ ...e })))

        const userChatMessageSub = enabledSubs.filter(sub => sub.type === 'channel.chat.message')
        console.log('userChatMessageSub', userChatMessageSub.map(e => ({ ...e })))
        if (userChatMessageSub.length === 0) {
            const tsp = createESTransport("/webhook/v1/twitch/event-sub/channel-chat-message")
            await twitchAppAPI.eventSub.subscribeToChannelChatMessageEvents(user.twitch_id, tsp)
        }

        const streamOnlineSubs = enabledSubs.filter(sub => sub.type === 'stream.online')
        console.log('streamOnlineSubs', streamOnlineSubs.map(e => ({ ...e })))
        if (streamOnlineSubs.length === 0) {
            const tsp = createESTransport("/webhook/v1/twitch/event-sub/stream-online")
            await twitchAppAPI.eventSub.subscribeToStreamOnlineEvents(user.twitch_id, tsp)
        }

        return this.firstWordRepository.create({
            ...request,
            reply_message: "สวัสดี {{user_name}} ยินดีต้อนรับเข้าสู่สตรีม!",
            overlay_key: randomBytes(16).toString("hex"),
        });
    }

    async getByUserId(userId: string): Promise<FirstWordWidget | null> {
        return this.firstWordRepository.getByOwnerId(userId)
    }

    async update(userId: string, data: UpdateFirstWord): Promise<FirstWordWidget> {
        const existing = await this.firstWordRepository.getByOwnerId(userId)
        if (!existing) {
            throw new Error("First word config not found")
        }
        const res = await this.firstWordRepository.update(existing.id, data)
        await redis.del(`first_word:owner_id:${userId}`)
        return res
    }

    async uploadAudio(userId: string, file: { buffer: Buffer, filename: string, mimetype: string }): Promise<void> {
        const firstWord = await this.firstWordRepository.getByOwnerId(userId)
        console.log('firstWord', firstWord)
        if (!firstWord) {
            throw new Error("First word not found")
        }
        if (firstWord.audio_key) {
            await s3.deleteFile(firstWord.audio_key)
        }
        console.log('file', file)
        const audioKey = `first-word/${firstWord.id}/audio/${file.filename}`
        console.log('audioKey', audioKey)
        await s3.uploadFile(file.buffer, audioKey, file.mimetype)
        await this.firstWordRepository.update(firstWord.id, { audio_key: audioKey })
        await redis.del(`first_word:owner_id:${userId}`)
    }

    async delete(userId: string): Promise<void> {
        const firstWord = await this.firstWordRepository.getByOwnerId(userId);
        if (!firstWord) {
            // If already deleted or not found, just return (idempotent) or throw error. 
            // Returning is safer for idempotency.
            return;
        }

        if (firstWord.audio_key) {
            try {
                await s3.deleteFile(firstWord.audio_key);
            } catch (error) {
                console.error("Failed to delete audio file", error);
                // Continue deletion even if S3 fails
            }
        }

        await this.firstWordRepository.delete(firstWord.id);

        // Clear caches
        await redis.del(`first_word:owner_id:${userId}`);
        await redis.del(`first_word:chatters:channel_id:${userId}`); // Assuming channel_id same as owner twitch_id logic elsewhere or close enough to clear
    }

    async refreshOverlayKey(userId: string): Promise<FirstWord> {
        const firstWord = await this.firstWordRepository.getByOwnerId(userId);
        if (!firstWord) {
            throw new Error("First word config not found");
        }

        const newKey = randomBytes(16).toString("hex");
        // TODO: Use widget repository
        const updated = await this.firstWordRepository.update(firstWord.id, { overlay_key: newKey });

        await redis.del(`first_word:owner_id:${userId}`);
        return updated;
    }

    async validateOverlayAccess(userId: string, key: string): Promise<boolean> {
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

        if (!firstWord) return false;

        // Use constant time comparison if possible, but for UUIDs/strings here standard checks are okay 
        // as long as we handle missing keys.
        return firstWord.widget.overlay_key === key;
    }

    async greetNewChatter(e: TwitchChannelChatMessageEventRequest): Promise<void> {

        let user: User | null = null
        const userCacheKey = `user:twitch_id:${e.broadcaster_user_id}`
        const userCache = await redis.get(userCacheKey)

        if (userCache) {
            user = JSON.parse(userCache)
        } else {
            user = await this.userRepository.getByTwitchId(e.broadcaster_user_id);
            redis.set(userCacheKey, JSON.stringify(user), TTL.TWO_HOURS)
        }

        if (!user) {
            throw new Error("User not found");
        }

        const firstWordCacheKey = `first_word:owner_id:${user.id}`
        const firstWordCache = await redis.get(firstWordCacheKey)
        let firstWord: FirstWordWidget | null = null

        if (firstWordCache) {
            firstWord = JSON.parse(firstWordCache)
            console.log('firstWordCache', firstWord)
        } else {
            firstWord = await this.firstWordRepository.getByOwnerId(user.id);
            console.log('firstWordDb', firstWord)
            redis.set(firstWordCacheKey, JSON.stringify(firstWord), TTL.TWO_HOURS)
        }

        if (!firstWord) {
            throw new Error("First word not found");
        }

        // Check if first word is enabled
        if (!firstWord.widget.enabled) {
            return
        }


        const senderId = firstWord.twitch_bot_id || this.cfg.twitch.defaultBotId

        // Check if user is bot itself
        if (e.chatter_user_id === senderId) {
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
        const chatter = chatters.find(chatter => chatter.twitch_chatter_id === e.chatter_user_id)

        // Check if user is already greeted and not a test user
        if (chatter && e.chatter_user_id !== "0") {
            return
        }

        let message = firstWord.reply_message

        // If replay message does not empty -> Send message to Twitch
        if (message) {
            const replaceMap = {
                "{{user_name}}": e.chatter_user_name
            }
            message = mapMessageVariables(message, replaceMap)
            console.log('send chat message', e.broadcaster_user_id, message)
            await twitchAppAPI.chat.sendChatMessageAsApp(senderId, e.broadcaster_user_id, message)
        }

        // If audio key does not empty -> Send audio to overlay
        if (firstWord.audio_key) {
            console.log('audio_key', firstWord.audio_key)
            const url = await s3.getSignedURL(firstWord.audio_key, { expiresIn: 3600 });
            console.log('url', url)
            await publisher.publish("first-word-audio", JSON.stringify({
                userId: user.id,
                audioUrl: url
            }))
            console.log('published')
        }

        // Add chatter to database if not test user to prevent duplicate greetings
        if (e.chatter_user_id !== "0") {
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
        }
    }

    async resetChatters(e: TwitchStreamOnlineEventRequest): Promise<void> {
        const user = await this.userRepository.getByTwitchId(e.broadcaster_user_id);
        if (!user) {
            throw new Error("User not found");
        }

        const firstWord = await this.firstWordRepository.getByOwnerId(user.id);
        if (!firstWord) {
            throw new Error("First word not found");
        }

        await this.firstWordRepository.clearChatters(firstWord.id)
        redis.del(`first_word:chatters:channel_id:${e.broadcaster_user_id}`)
    }

    async clearCaches(): Promise<void> {
        const keys = await redis.keys("first_word:*")
        for (const key of keys) {
            await redis.del(key)
        }
    }
}