import Configurations from "@/config/index";
import { TwitchChannelChatMessageEventRequest } from "@/events/twitch/channelChatMessage/request";
import { TwitchStreamOnlineEventRequest } from "@/events/twitch/streamOnline/request";
import redis, { TTL } from "@/libs/redis";
import { createESTransport, twitchAppAPI } from "@/libs/twurple";
import FirstWordRepository from "@/repositories/firstWord/firstWord.repository";
import { CreateFirstWordRequest } from "@/repositories/firstWord/request";
import UserRepository from "@/repositories/user/user.repository";
import { FirstWord, FirstWordChatter, User } from "generated/prisma/client";

export default class FirstWordService {
    private readonly cfg: Configurations
    private readonly firstWordRepository: FirstWordRepository;
    private readonly userRepository: UserRepository;

    constructor(cfg: Configurations, firstWordRepository: FirstWordRepository, userRepository: UserRepository) {
        this.cfg = cfg;
        this.firstWordRepository = firstWordRepository;
        this.userRepository = userRepository;
    }

    async create(request: CreateFirstWordRequest): Promise<void> {
        const user = await this.userRepository.get(request.owner_id);
        if (!user) {
            throw new Error("User not found");
        }

        const userSubs = await twitchAppAPI.eventSub.getSubscriptionsForUser(user.twitch_id);
        const enabledSubs = userSubs.data.filter(sub => sub.status === 'enabled')

        const userChatMessageSub = enabledSubs.filter(sub => sub.type === 'channel.chat.message')
        if (userChatMessageSub.length === 0) {
            const tsp = createESTransport("/webhook/v1/twitch/event-sub/chat-message-events")
            await twitchAppAPI.eventSub.subscribeToChannelChatMessageEvents(user.twitch_id, tsp)
        }

        const streamOnlineSubs = enabledSubs.filter(sub => sub.type === 'stream.online')
        if (streamOnlineSubs.length === 0) {
            const tsp = createESTransport("/webhook/v1/twitch/event-sub/stream-online-events")
            await twitchAppAPI.eventSub.subscribeToStreamOnlineEvents(user.twitch_id, tsp)
        }

        await this.firstWordRepository.create(request);
    }

    async greetNewChatter(e: TwitchChannelChatMessageEventRequest): Promise<void> {

        if (e.chatter_user_id === this.cfg.twitch.defaultBotId) {
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
        if (chatter) {
            return
        }

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
        let firstWord: FirstWord | null = null

        if (firstWordCache) {
            firstWord = JSON.parse(firstWordCache)
        } else {
            firstWord = await this.firstWordRepository.getByOwnerId(user.id);
            redis.set(firstWordCacheKey, JSON.stringify(firstWord), TTL.TWO_HOURS)
        }

        if (!firstWord) {
            throw new Error("First word not found");
        }

        let message = firstWord.reply_message

        const replaceMap = {
            "{{user_login}}": e.chatter_user_login,
            "{{user_name}}": e.chatter_user_name,
            "{{broadcaster_user_login}}": e.broadcaster_user_login,
            "{{broadcaster_user_name}}": e.broadcaster_user_name,
            "{{message_text}}": e.message.text,
            "{{color}}": e.color,
        }

        if (message) {
            for (const [key, value] of Object.entries(replaceMap)) {
                message = message.replace(new RegExp(key, "g"), value)
            }
            await twitchAppAPI.chat.sendChatMessageAsApp(this.cfg.twitch.defaultBotId, e.broadcaster_user_id, message)
        }

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
}