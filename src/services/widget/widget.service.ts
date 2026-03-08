import { ForbiddenError, NotFoundError } from "@/errors";
import redis, { TTL } from "@/libs/redis";
import TLogger, { Layer } from "@/logging/logger";
import { UpdateWidget } from "@/repositories/widget/request";
import WidgetRepository from "@/repositories/widget/widget.repository";
import UserService from "../user/user.service";
import { ListResponse, Pagination } from "../response";
import { ExtendedWidget } from "@/repositories/widget/response";
import UserRepository from "@/repositories/user/user.repository";

export default class WidgetService {
    private readonly widgetRepository: WidgetRepository;
    private readonly userService: UserService
    private readonly userRepository: UserRepository
    private logger: TLogger;

    constructor(
        widgetRepository: WidgetRepository,
        userService: UserService,
        userRepository: UserRepository
    ) {
        this.widgetRepository = widgetRepository;
        this.userService = userService;
        this.userRepository = userRepository;
        this.logger = new TLogger(Layer.SERVICE);
    }

    async authorizeOwnership(userId: string, widgetId: string) {
        const widget = await this.get(widgetId);
        if (widget.owner_id !== userId) {
            this.logger.warn({ message: "You are not the owner of this widget", data: { userId, widgetId: widget.id } });
            throw new ForbiddenError("You are not the owner of this widget");
        }
    }

    async authorizeTierUsage(userId: string, widgetId: string) {
        const tier = await this.userService.getTier(userId);
        const active = await this.getTotalByOwnerId(userId);
        if (tier === UserTier.FREE_TIER && active >= 1) {
            this.logger.warn({ message: "You need to be at least tier 1 to use more widgets", data: { userId, widgetId } });
            throw new ForbiddenError("You need to be at least tier 1 to use this widget");
        }
    }

    async authorizeByTwitchId(twitchId: string, widgetId: string) {
        const user = await this.userService.getByTwitchId(twitchId);
        await this.authorize(user.id, widgetId);
    }

    async update(id: string, userId: string, request: UpdateWidget) {
        this.logger.setContext("service.widget.update");
        const existing = await this.widgetRepository.get(id);
        if (!existing) {
            throw new NotFoundError("Widget not found");
        }
        await this.authorize(userId, existing.id);

        const res = await this.widgetRepository.update(id, request);
        redis.del(`widget:${id}`)
        redis.del(`widget:total:owner:${userId}`)
        return res
    }

    async updateEnable(id: string, userId: string, value: boolean) {
        this.logger.setContext("service.widget.updateEnable");
        const existing = await this.widgetRepository.get(id);
        if (!existing) {
            throw new NotFoundError("Widget not found");
        }
        await this.authorize(userId, existing.id);

        return this.update(id, userId, { enabled: value });
    }

    async delete(id: string, userId: string) {
        this.logger.setContext("service.widget.delete");
        const existing = await this.widgetRepository.get(id);
        if (!existing) {
            throw new NotFoundError("Widget not found");
        }
        await this.authorize(userId, existing.id);

        return this.widgetRepository.delete(id);
    }

    async validateOverlayAccess(userId: string, key: string) {
        this.logger.setContext("service.widget.validateOverlayAccess");
        this.logger.info({ message: "Validating overlay access", data: { userId } });
        try {
            const widget = await this.widgetRepository.getByOverlayKey(key);
            if (!widget) {
                this.logger.warn({ message: "Widget not found", data: { userId } });
                return false;
            }
            if (widget.owner_id !== userId) {
                this.logger.warn({ message: "Unauthorized access attempt", data: { userId, widgetId: widget.id } });
                return false;
            }

            this.logger.info({ message: "Validing overlay access", data: { widget, key } });
            return widget.overlay_key === key;
        } catch (error) {
            this.logger.error({ message: "Failed to validate overlay access", error: error as Error, data: { userId } });
            return false;
        }
    }

    async get(widgetId: string) {
        this.logger.setContext("service.widget.get");
        const cacheKey = `widget:${widgetId}`;
        const cachedWidget = await redis.get(cacheKey);
        if (cachedWidget) {
            return JSON.parse(cachedWidget);
        }

        const widget = await this.widgetRepository.get(widgetId);
        if (!widget) {
            throw new NotFoundError("Widget not found");
        }

        await redis.set(cacheKey, JSON.stringify(widget), TTL.ONE_DAY);
        return widget;
    }

    async listByOwnerId(ownerId: string, pagination: Pagination, filters?: { enabled?: boolean }): Promise<ListResponse<ExtendedWidget>> {
        this.logger.setContext("service.widget.listByOwnerId");
        this.logger.info({ message: "Listing widgets by owner ID", data: { ownerId } });
        const [widgets, total] = await this.widgetRepository.listByOwnerId(ownerId, pagination, filters);
        this.logger.info({ message: "Widgets listed successfully", data: { widgets, total } });
        return {
            data: widgets,
            pagination: {
                ...pagination,
                total: total
            }
        };
    }

    async getTotalByOwnerId(ownerId: string, filters?: { enabled?: boolean }): Promise<number> {
        const total = await this.listByOwnerId(ownerId, { page: 1, limit: 1 }, filters);
        const res = total.pagination.total || 0;
        return res
    }

    async disableAll(ownerId: string) {
        this.logger.setContext("service.widget.disableAll");
        this.logger.info({ message: "Disabling all widgets", data: { ownerId } });
        await this.widgetRepository.disableAll(ownerId);
    }
}