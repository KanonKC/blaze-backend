import { CreateFirstWordRequest } from "@/repositories/firstWord/request";
import FirstWordRepository from "@/repositories/firstWord/firstWord.repository";
import { twitchAppAPI } from "@/libs/twurple";
import UserRepository from "@/repositories/user/user.repository";
import { TwitchChannelChatMessageEventRequest } from "@/events/twitch/chatMessage/request";
import { TwitchStreamOnlineEventRequest } from "@/events/twitch/streamOnline/request";

export default class FirstWordService {
    private readonly firstWordRepository: FirstWordRepository;
    private readonly userRepository: UserRepository;

    constructor(firstWordRepository: FirstWordRepository, userRepository: UserRepository) {
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
            await twitchAppAPI.eventSub.subscribeToChannelChatMessageEvents(user.twitch_id, {
                method: "webhook",
                callback: "https://blaze-dev.kanonkc.com/webhook/v1/twitch/event-sub/chat-message-events",
                secret: "8chkr2187r3y6ppl57pspl5hjea2v0",
            })
        }

        const streamOnlineSubs = enabledSubs.filter(sub => sub.type === 'stream.online')
        if (streamOnlineSubs.length === 0) {
            await twitchAppAPI.eventSub.subscribeToStreamOnlineEvents(user.twitch_id, {
                method: "webhook",
                callback: "https://blaze-dev.kanonkc.com/webhook/v1/twitch/event-sub/stream-online-events",
                secret: "8chkr2187r3y6ppl57pspl5hjea2v0",
            })
        }

        await this.firstWordRepository.create(request);
    }

    async greetNewChatter(e: TwitchChannelChatMessageEventRequest): Promise<void> {

        if (e.chatter_user_id === "1108286106") {
            return
        }

        const user = await this.userRepository.getByTwitchId(e.broadcaster_user_id);
        if (!user) {
            throw new Error("User not found");
        }

        const firstWord = await this.firstWordRepository.getByOwnerId(user.id);
        if (!firstWord) {
            throw new Error("First word not found");
        }

        try {
            await this.firstWordRepository.addChatter(firstWord.id, e.chatter_user_id)
        } catch (error) {
            return
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
            await twitchAppAPI.chat.sendChatMessageAsApp("1108286106", e.broadcaster_user_id, message)
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
    }
}