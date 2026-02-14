import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import TLogger, { Layer } from "@/logging/logger";
import { getUserFromRequest } from "../middleware";
import WidgetService from "@/services/widget/widget.service";
import { updateWidgetEnabledSchema, updateWidgetOverlaySchema } from "./schemas";

export default class WidgetController {
    private widgetService: WidgetService;
    private readonly logger: TLogger;

    constructor(widgetService: WidgetService) {
        this.widgetService = widgetService;
        this.logger = new TLogger(Layer.CONTROLLER);
    }

    async updateEnabled(req: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("controller.widget.updateEnabled");
        this.logger.info({ message: "Updating widget enabled status" });
        const user = getUserFromRequest(req);
        if (!user) {
            this.logger.warn({ message: "Unauthorized access attempt" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const { id } = req.params as { id: string };
            const request = updateWidgetEnabledSchema.parse(req.body);
            const updated = await this.widgetService.updateEnabled(id, request.enabled);
            this.logger.info({ message: "Successfully updated widget enabled status", data: { userId: user.id, widgetId: id, enabled: request.enabled } });
            res.send(updated);
        } catch (error) {
            if (error instanceof z.ZodError) {
                this.logger.warn({ message: "Validation error", error: error.message });
                return res.status(400).send({ message: "Validation Error", errors: error.issues });
            }
            this.logger.error({ message: "Failed to update widget enabled status", data: { userId: user.id }, error: error as Error });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async updateOverlay(req: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("controller.widget.updateOverlay");
        this.logger.info({ message: "Updating widget overlay" });
        const user = getUserFromRequest(req);
        if (!user) {
            this.logger.warn({ message: "Unauthorized access attempt" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const { id } = req.params as { id: string };
            const request = updateWidgetOverlaySchema.parse(req.body);
            const updated = await this.widgetService.updateOverlay(id, request.overlay);
            this.logger.info({ message: "Successfully updated widget overlay", data: { userId: user.id, widgetId: id } });
            res.send(updated);
        } catch (error) {
            if (error instanceof z.ZodError) {
                this.logger.warn({ message: "Validation error", error: error.message });
                return res.status(400).send({ message: "Validation Error", errors: error.issues });
            }
            this.logger.error({ message: "Failed to update widget overlay", data: { userId: user.id }, error: error as Error });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async delete(req: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("controller.widget.delete");
        this.logger.info({ message: "Deleting widget" });
        const user = getUserFromRequest(req);
        if (!user) {
            this.logger.warn({ message: "Unauthorized access attempt" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const { id } = req.params as { id: string };
            await this.widgetService.delete(id);
            this.logger.info({ message: "Successfully deleted widget", data: { userId: user.id, widgetId: id } });
            res.status(204).send();
        } catch (error) {
            this.logger.error({ message: "Failed to delete widget", data: { userId: user.id }, error: error as Error });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }
}
