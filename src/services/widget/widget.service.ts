import { ForbiddenError, NotFoundError } from "@/errors";
import redis, { TTL } from "@/libs/redis";
import TLogger, { Layer } from "@/logging/logger";
import { UpdateWidget } from "@/repositories/widget/request";
import WidgetRepository from "@/repositories/widget/widget.repository";
import UserService from "../user/user.service";

export default class WidgetService {
    private readonly widgetRepository: WidgetRepository;
    private readonly userService: UserService
    private logger: TLogger;

    constructor(
        widgetRepository: WidgetRepository,
        userService: UserService
    ) {
        this.widgetRepository = widgetRepository;
        this.userService = userService;
        this.logger = new TLogger(Layer.SERVICE);
    }

    async authorize(userId: string, widgetId: string) {
        const tier = await this.userService.getTier(userId);
        const widget = await this.get(widgetId);
        if (widget.widget_type && tier < widget.widget_type.tier_required) {
            this.logger.warn({ message: "You need to be at least tier 1 to use this widget", data: { userId, widgetId: widget.id } });
            throw new ForbiddenError("You need to be at least tier 1 to use this widget");
        }
        if (widget.owner_id !== userId) {
            this.logger.warn({ message: "You are not the owner of this widget", data: { userId, widgetId: widget.id } });
            throw new ForbiddenError("You are not the owner of this widget");
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

        return this.widgetRepository.update(id, request);
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
}