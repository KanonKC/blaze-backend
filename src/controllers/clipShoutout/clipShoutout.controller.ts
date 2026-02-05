import { FastifyReply, FastifyRequest } from "fastify";
import ClipShoutoutService from "@/services/clipShoutout/clipShoutout.service";
import ClipShoutoutEventController from "./clipShoutout.event.controller";
import { getUserFromRequest } from "../middleware";
import { createClipShoutoutSchema, updateClipShoutoutSchema } from "./schemas";
import { z } from "zod";
import logger from "@/libs/winston";

export default class ClipShoutoutController {
    private clipShoutoutService: ClipShoutoutService;
    private clipShoutoutEventController: ClipShoutoutEventController;

    constructor(clipShoutoutService: ClipShoutoutService, clipShoutoutEventController: ClipShoutoutEventController) {
        this.clipShoutoutService = clipShoutoutService;
        this.clipShoutoutEventController = clipShoutoutEventController;
    }

    async get(req: FastifyRequest, res: FastifyReply) {
        logger.info("controller.clipShoutout.get: Getting clip shoutout config");
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("controller.clipShoutout.get: Unauthorized access attempt");
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const config = await this.clipShoutoutService.getByUserId(user.id);
            if (!config) {
                logger.info("controller.clipShoutout.get: Clip shoutout not enabled", { userId: user.id });
                return res.status(404).send({ message: "Clip shoutout not enabled" });
            }
            logger.info("controller.clipShoutout.get: Successfully retrieved clip shoutout", { userId: user.id });
            res.send(config);
        } catch (error) {
            logger.error("controller.clipShoutout.get: Failed to get clip shoutout", { error, userId: user.id });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async update(req: FastifyRequest, res: FastifyReply) {
        logger.info("controller.clipShoutout.update: Updating clip shoutout config");
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("controller.clipShoutout.update: Unauthorized access attempt");
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const request = updateClipShoutoutSchema.parse(req.body);
            const updated = await this.clipShoutoutService.update(user.id, request);
            logger.info("controller.clipShoutout.update: Successfully updated clip shoutout", { userId: user.id });
            res.send(updated);
        } catch (error) {
            if (error instanceof z.ZodError) {
                logger.warn("controller.clipShoutout.update: Validation error", { error: error.message });
                return res.status(400).send({ message: "Validation Error", errors: error.message });
            }
            logger.error("controller.clipShoutout.update: Failed to update clip shoutout", { error, userId: user.id });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async create(req: FastifyRequest, res: FastifyReply) {
        logger.info("controller.clipShoutout.create: Creating clip shoutout config");
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("controller.clipShoutout.create: Unauthorized access attempt");
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const request = createClipShoutoutSchema.parse(req.body);
            const created = await this.clipShoutoutService.create(request);
            logger.info("controller.clipShoutout.create: Successfully created clip shoutout", { userId: user.id });
            res.status(201).send(created);
        } catch (error) {
            if (error instanceof z.ZodError) {
                logger.warn("controller.clipShoutout.create: Validation error", { error: error.issues });
                return res.status(400).send({ message: "Validation Error", errors: error.issues });
            }
            logger.error("controller.clipShoutout.create: Failed to create clip shoutout", { error, userId: user.id });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async delete(req: FastifyRequest, res: FastifyReply) {
        logger.info("controller.clipShoutout.delete: Deleting clip shoutout config");
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("controller.clipShoutout.delete: Unauthorized access attempt");
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            await this.clipShoutoutService.delete(user.id);
            this.clipShoutoutEventController.disconnectUser(user.id);
            logger.info("controller.clipShoutout.delete: Successfully deleted clip shoutout", { userId: user.id });
            res.status(204).send();
        } catch (error) {
            logger.error("controller.clipShoutout.delete: Failed to delete clip shoutout", { error, userId: user.id });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async refreshKey(req: FastifyRequest, res: FastifyReply) {
        logger.info("controller.clipShoutout.refreshKey: Refreshing overlay key");
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("controller.clipShoutout.refreshKey: Unauthorized access attempt");
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const updated = await this.clipShoutoutService.refreshOverlayKey(user.id);
            this.clipShoutoutEventController.disconnectUser(user.id);
            logger.info("controller.clipShoutout.refreshKey: Successfully refreshed overlay key", { userId: user.id });
            res.send(updated);
        } catch (error) {
            logger.error("controller.clipShoutout.refreshKey: Failed to refresh overlay key", { error, userId: user.id });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }
}
