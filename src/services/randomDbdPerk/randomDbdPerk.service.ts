import RandomDbdPerkRepository from "@/repositories/randomDbdPerk/randomDbdPerk.repository";
import { CreateRandomDbdPerk, RandomDbdPerkClassType, UpdateRandomDbdPerk } from "@/repositories/randomDbdPerk/request";
import UserRepository from "@/repositories/user/user.repository";
import { createESTransport, twitchAppAPI } from "@/libs/twurple";
import TLogger, { Layer } from "@/logging/logger";
import { RandomDbdPerkWidget } from "@/repositories/randomDbdPerk/response";
import redis, { TTL, publisher } from "@/libs/redis";
import { prisma } from "@/libs/prisma";
import crypto from "crypto";
import { TwitchChannelRedemptionAddEventRequest } from "@/events/twitch/channelRedemptionAdd/request";
import axios from "axios";
import { DbdPerkPagination } from "./response";
import { capitalize } from "@/utils/message";


export default class RandomDbdPerkService {
    private readonly randomDbdPerkRepository: RandomDbdPerkRepository;
    private readonly userRepository: UserRepository;
    private readonly logger: TLogger;

    constructor(randomDbdPerkRepository: RandomDbdPerkRepository, userRepository: UserRepository) {
        this.randomDbdPerkRepository = randomDbdPerkRepository;
        this.userRepository = userRepository;
        this.logger = new TLogger(Layer.SERVICE);
    }

    async create(request: CreateRandomDbdPerk): Promise<RandomDbdPerkWidget> {
        this.logger.setContext("service.randomDbdPerk.create");
        const user = await this.userRepository.get(request.owner_id);
        if (!user) {
            throw new Error("User not found");
        }

        const userSubs = await twitchAppAPI.eventSub.getSubscriptionsForUser(user.twitch_id);
        const enabledSubs = userSubs.data.filter(sub => sub.status === 'enabled')

        const channelRewardRedemptionSub = enabledSubs.filter(sub => sub.type === 'channel.channel_points_custom_reward_redemption.add')
        if (channelRewardRedemptionSub.length === 0) {
            const tsp = createESTransport("/webhook/v1/twitch/event-sub/channel-redemption-add")
            await twitchAppAPI.eventSub.subscribeToChannelRedemptionAddEvents(user.twitch_id, tsp)
            this.logger.info({ message: "Subscribed to channel redemption add events", data: { userId: user.id, twitchId: user.twitch_id } });
        }

        return this.randomDbdPerkRepository.create(request);
    }

    async update(id: string, request: UpdateRandomDbdPerk): Promise<RandomDbdPerkWidget> {
        this.logger.setContext("service.randomDbdPerk.update");
        const updated = await this.randomDbdPerkRepository.update(id, request);
        if (updated) {
            await redis.del(`random_dbd_perk:owner_id:${updated.widget.owner_id}`);
            await redis.del(`random_dbd_perk:twitch_id:${updated.widget.twitch_id}`);
        }
        return updated;
    }

    async delete(userId: string): Promise<void> {
        this.logger.setContext("service.randomDbdPerk.delete");
        const existing = await this.randomDbdPerkRepository.getByOwnerId(userId);
        if (!existing) {
            return;
        }

        await this.randomDbdPerkRepository.delete(existing.id);

        await redis.del(`random_dbd_perk:twitch_id:${existing.widget.twitch_id}`);
        await redis.del(`random_dbd_perk:owner_id:${userId}`);
    }

    async getByUserId(userId: string): Promise<RandomDbdPerkWidget | null> {
        return this.randomDbdPerkRepository.getByOwnerId(userId);
    }

    async randomPerk(event: TwitchChannelRedemptionAddEventRequest): Promise<void> {
        const rewardId = event.reward.id
        const randomClass = await this.randomDbdPerkRepository.getClassByRewardId(rewardId)

        if (!randomClass) {
            this.logger.warn({ message: "Random class not found", data: { rewardId } });
            return;
        }

        const maxPerkCount = await this.getTotalPerkCount(randomClass.type)
        const randomSize = Math.min(maxPerkCount, randomClass.maximum_random_size)

        const randomResult: number[] = []
        const perkCount = 4
        for (let i = 0; i < perkCount; i++) {
            const randomPerk = (Math.floor(Math.random() * randomSize)) + 1
            randomResult.push(randomPerk)
        }

        const pagination = randomResult.map(this.paginateDbdPerk)
        const randomPerkMessage = pagination.map(p => ` ${p.page}/${p.row * 5 + p.perk}`).join(" |")
        const message = `Random ${capitalize(randomClass.type)} Perks [${randomPerkMessage} ]`

        const senderId = event.broadcaster_user_id
        try {
            await twitchAppAPI.chat.sendChatMessageAsApp(senderId, senderId, message)
        } catch (error) {
            this.logger.error({ message: "Failed to send chat message", data: { error } });
        }

        const user = await this.userRepository.getByTwitchId(senderId)
        if (user) {
            await publisher.publish("random-dbd-perk", JSON.stringify({
                userId: user.id,
                perks: pagination,
                type: randomClass.type
            }))
        }
    }

    async getTotalPerkCount(type: string): Promise<number> {
        const cacheKey = `random_dbd_perk:total_perk_count:${type}`

        const cachedCount = await redis.get(cacheKey)
        if (cachedCount) {
            return parseInt(cachedCount)
        }

        const { data } = await axios.get("https://deadbydaylight.fandom.com/wiki/Perks")

        let perkCountRes: string[] = []
        if (type === RandomDbdPerkClassType.KILLER) {
            perkCountRes = data.match(/Killer Perks.*\)/g)
        } else {
            perkCountRes = data.match(/Survivor Perks.*\)/g)
        }

        if (perkCountRes.length === 0) {
            throw new Error("No perks found")
        }
        const countStr = perkCountRes[0].split(" ").pop()?.slice(1, -1)
        if (!countStr) {
            throw new Error("No count found")
        }
        const count = parseInt(countStr)
        redis.set(cacheKey, count, TTL.ONE_DAY)
        return count
    }

    paginateDbdPerk(sequence: number): DbdPerkPagination {
        const page = (Math.floor(sequence / 15)) + 1
        let perk = sequence % 15
        const row = (Math.floor(perk / 5)) + 1
        perk = (perk % 5) + 1
        return { page, row, perk }
    }

    async validateOverlayAccess(userId: string, key: string): Promise<boolean> {
        this.logger.setContext("service.randomDbdPerk.validateOverlayAccess");
        const cacheKey = `random_dbd_perk:owner_id:${userId}`;
        let widget: RandomDbdPerkWidget | null = null;

        const cached = await redis.get(cacheKey);
        if (cached) {
            widget = JSON.parse(cached);
        } else {
            widget = await this.randomDbdPerkRepository.getByOwnerId(userId);
            if (widget) {
                await redis.set(cacheKey, JSON.stringify(widget), TTL.ONE_DAY);
            }
        }

        if (!widget) return false;

        return widget.widget.overlay_key === key;
    }

    async refreshKey(userId: string): Promise<{ overlay_key: string }> {
        this.logger.setContext("service.randomDbdPerk.refreshKey");
        const widget = await this.randomDbdPerkRepository.getByOwnerId(userId);
        if (!widget) {
            throw new Error("Widget not found");
        }

        const newKey = crypto.randomUUID();
        await prisma.widget.update({
            where: { id: widget.widget.id },
            data: { overlay_key: newKey }
        });

        const cacheKey = `random_dbd_perk:owner_id:${userId}`;
        await redis.del(cacheKey);

        return { overlay_key: newKey };
    }
}
