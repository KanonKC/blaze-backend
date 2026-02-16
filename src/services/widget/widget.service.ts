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
}