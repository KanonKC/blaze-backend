import ClipShoutoutRepository from "@/repositories/clipShoutout/clipShoutout.repository";
import { ClipShoutoutCreateRequest, ClipShoutoutUpdateRequest } from "./request";
import UserRepository from "@/repositories/user/user.repository";
import { randomBytes } from "crypto";
import { createESTransport, twitchAppAPI } from "@/libs/twurple";
import { TwitchChannelChatNotificationEventRequest } from "@/events/twitch/channelChatNotification/request";
import { HelixPaginatedClipFilter } from "@twurple/api";
import { mapMessageVariables } from "@/utils/message";
import redis, { publisher, TTL } from "@/libs/redis";
import { ClipShoutout } from "generated/prisma/client";
import AuthService from "../auth/auth.service";
import TwitchGql from "@/providers/twitchGql";
import logger from "@/libs/winston";

export default class ClipShoutoutService {
    private readonly clipShoutoutRepository: ClipShoutoutRepository;
    private readonly userRepository: UserRepository;
    private readonly authService: AuthService;
    private readonly twitchGql: TwitchGql;

    constructor(clipShoutoutRepository: ClipShoutoutRepository, userRepository: UserRepository, authService: AuthService, twitchGql: TwitchGql) {
        this.clipShoutoutRepository = clipShoutoutRepository;
        this.userRepository = userRepository;
        this.authService = authService;
        this.twitchGql = twitchGql;
    }

    async create(request: ClipShoutoutCreateRequest) {
        const user = await this.userRepository.get(request.owner_id);
        if (!user) {
            throw new Error("User not found");
        }

        const userSubs = await twitchAppAPI.eventSub.getSubscriptionsForUser(user.twitch_id);
        const enabledSubs = userSubs.data.filter(sub => sub.status === 'enabled')

        const userChatNotificationSub = enabledSubs.filter(sub => sub.type === 'channel.chat.notification')
        if (userChatNotificationSub.length === 0) {
            const tsp = createESTransport("/webhook/v1/twitch/event-sub/channel-chat-notification")
            await twitchAppAPI.eventSub.subscribeToChannelChatNotificationEvents(user.twitch_id, tsp)
        }

        return this.clipShoutoutRepository.create({
            ...request,
            reply_message: "",
            twitch_bot_id: user.twitch_id,
            overlay_key: randomBytes(16).toString("hex")
        });
    }

    async shoutoutRaider(event: TwitchChannelChatNotificationEventRequest) {

        if (event.notice_type !== "raid" || !event.raid) {
            return
        }

        let csConfig: ClipShoutout | null = null
        const cacheKey = `clip_shoutout:twitch_id:${event.broadcaster_user_id}`

        const cachedCsConfig = await redis.get(cacheKey)
        if (cachedCsConfig) {
            csConfig = JSON.parse(cachedCsConfig)
        } else {
            csConfig = await this.clipShoutoutRepository.getByTwitchId(event.broadcaster_user_id)
        }
        console.log('csConfig', csConfig)
        logger.info("service.clipShoutout.shoutoutRaider: Get config", { data: csConfig })
        if (!csConfig || !csConfig.enabled) {
            logger.info("service.clipShoutout.shoutoutRaider: Config not found or disabled")
            return
        }

        await redis.set(cacheKey, JSON.stringify(csConfig), TTL.TWO_HOURS)

        console.log('shouting out', csConfig.twitch_id, event.raid.user_id)
        try {
            logger.info("service.clipShoutout.shoutoutRaider: Shouting out", { data: { twitch_id: csConfig.twitch_id, raid_user_id: event.raid.user_id } })
            const twitchUserAPI = await this.authService.createTwitchUserAPI(csConfig.twitch_bot_id)
            await twitchUserAPI.chat.shoutoutUser(csConfig.twitch_id, event.raid.user_id)
        } catch (err) {
            logger.error("service.clipShoutout.shoutoutRaider: Shoutout failed", { error: err })
        }

        if (csConfig.reply_message) {
            const replaceMap = {
                "{{user_name}}": event.raid.user_name,
                "{{viewer_count}}": event.raid.viewer_count,
                "{{channel_link}}": `https://twitch.tv/${event.raid.user_login}`,
            }
            const message = mapMessageVariables(csConfig.reply_message, replaceMap)
            logger.info("service.clipShoutout.shoutoutRaider: Sending reply", { data: { twitch_bot_id: csConfig.twitch_bot_id, broadcaster_user_id: event.broadcaster_user_id, message } })
            await twitchAppAPI.chat.sendChatMessageAsApp(csConfig.twitch_bot_id, event.broadcaster_user_id, message)
        }

        if (csConfig.enabled_clip) {

            const filters: HelixPaginatedClipFilter = {
                isFeatured: csConfig.enabled_highlight_only
            }
            const clips = await twitchAppAPI.clips.getClipsForBroadcaster(event.raid.user_id, filters)
            if (clips.data.length > 0) {
                const selectedClip = clips.data[Math.floor(Math.random() * clips.data.length)]
                const clipProductionUrl = await this.twitchGql.getClipProductionUrl(selectedClip.id)
                console.log('clipProductionUrl', clipProductionUrl)
                logger.info("service.clipShoutout.shoutoutRaider: Sending clip", { data: { clipProductionUrl, duration: selectedClip.duration, owner_id: csConfig.owner_id } })
                await publisher.publish("clip-shoutout-clip", JSON.stringify({
                    url: clipProductionUrl,
                    duration: selectedClip.duration,
                    userId: csConfig.owner_id
                }))
            }
        }

    }

    async getByUserId(userId: string): Promise<ClipShoutout | null> {
        return this.clipShoutoutRepository.getByOwnerId(userId)
    }

    async update(userId: string, data: ClipShoutoutUpdateRequest): Promise<ClipShoutout> {
        const existing = await this.clipShoutoutRepository.getByOwnerId(userId)
        if (!existing) {
            throw new Error("Clip shoutout config not found")
        }
        const res = await this.clipShoutoutRepository.update(existing.id, data)
        await redis.del(`clip_shoutout:twitch_id:${existing.twitch_id}`)
        await redis.del(`clip_shoutout:owner_id:${userId}`)
        return res
    }

    async delete(userId: string): Promise<void> {
        const existing = await this.clipShoutoutRepository.getByOwnerId(userId);
        if (!existing) {
            return;
        }

        await this.clipShoutoutRepository.delete(existing.id);

        await redis.del(`clip_shoutout:twitch_id:${existing.twitch_id}`);
        await redis.del(`clip_shoutout:owner_id:${userId}`);
    }

    async refreshOverlayKey(userId: string): Promise<ClipShoutout> {
        const existing = await this.clipShoutoutRepository.getByOwnerId(userId);
        if (!existing) {
            throw new Error("Clip shoutout config not found");
        }

        const newKey = randomBytes(16).toString("hex");
        const updated = await this.clipShoutoutRepository.update(existing.id, { overlay_key: newKey });

        await redis.del(`clip_shoutout:twitch_id:${existing.twitch_id}`);
        await redis.del(`clip_shoutout:owner_id:${userId}`);
        return updated;
    }

    async validateOverlayAccess(userId: string, key: string): Promise<boolean> {
        const cacheKey = `clip_shoutout:owner_id:${userId}`
        let config: ClipShoutout | null = null

        const cached = await redis.get(cacheKey)
        if (cached) {
            config = JSON.parse(cached)
        } else {
            config = await this.clipShoutoutRepository.getByOwnerId(userId);
            if (config) {
                redis.set(cacheKey, JSON.stringify(config), TTL.TWO_HOURS)
            }
        }

        console.log("Config", config);

        if (!config) return false;
        return config.overlay_key === key;
    }
}