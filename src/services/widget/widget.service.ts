import WidgetRepository from "@/repositories/widget/widget.repository";
import { UpdateWidget } from "@/repositories/widget/request";
import TLogger, { Layer } from "@/logging/logger";
import { ForbiddenError, NotFoundError } from "@/errors";
import { Widget } from "generated/prisma/client";

export default class WidgetService {
    private widgetRepository: WidgetRepository;
    private logger: TLogger;

    constructor(
        widgetRepository: WidgetRepository
    ) {
        this.widgetRepository = widgetRepository;
        this.logger = new TLogger(Layer.SERVICE);
    }

    private authorize(userId: string, resource: Widget) {
        if (resource.owner_id !== userId) {
            this.logger.warn({ message: "Unauthorized access attempt", data: { userId, resourceId: resource.id } });
            throw new ForbiddenError("You are not the owner of this widget");
        }
    }

    async update(id: string, userId: string, request: UpdateWidget) {
        this.logger.setContext("service.widget.update");
        const existing = await this.widgetRepository.findById(id);
        if (!existing) {
            throw new NotFoundError("Widget not found");
        }
        this.authorize(userId, existing);

        return this.widgetRepository.update(id, request);
    }

    async delete(id: string, userId: string) {
        this.logger.setContext("service.widget.delete");
        const existing = await this.widgetRepository.findById(id);
        if (!existing) {
            throw new NotFoundError("Widget not found");
        }
        this.authorize(userId, existing);

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
}