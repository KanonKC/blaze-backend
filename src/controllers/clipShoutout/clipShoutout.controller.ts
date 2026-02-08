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
        logger.info("Getting clip shoutout config", { layer: "controller", context: "controller.clipShoutout.get" });
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("Unauthorized access attempt", { layer: "controller", context: "controller.clipShoutout.get" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const config = await this.clipShoutoutService.getByUserId(user.id);
            if (!config) {
                logger.info("Clip shoutout not enabled", { layer: "controller", context: "controller.clipShoutout.get", data: { userId: user.id } });
                return res.status(404).send({ message: "Clip shoutout not enabled" });
            }
            logger.info("Successfully retrieved clip shoutout", { layer: "controller", context: "controller.clipShoutout.get", data: { userId: user.id } });
            res.send(config);
        } catch (error) {
            logger.error("Failed to get clip shoutout", { layer: "controller", context: "controller.clipShoutout.get", data: { userId: user.id }, error });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async update(req: FastifyRequest, res: FastifyReply) {
        logger.info("Updating clip shoutout config", { layer: "controller", context: "controller.clipShoutout.update" });
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("Unauthorized access attempt", { layer: "controller", context: "controller.clipShoutout.update" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            console.log('cs req.body', req.body);
            const request = updateClipShoutoutSchema.parse(req.body);
            const updated = await this.clipShoutoutService.update(user.id, request);
            logger.info("Successfully updated clip shoutout", { layer: "controller", context: "controller.clipShoutout.update", data: { userId: user.id } });
            res.send(updated);
        } catch (error) {
            if (error instanceof z.ZodError) {
                logger.warn("Validation error", { layer: "controller", context: "controller.clipShoutout.update", error: error.message });
                return res.status(400).send({ message: "Validation Error", errors: error.message });
            }
            logger.error("Failed to update clip shoutout", { layer: "controller", context: "controller.clipShoutout.update", data: { userId: user.id }, error });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async create(req: FastifyRequest, res: FastifyReply) {
        logger.info("Creating clip shoutout config", { layer: "controller", context: "controller.clipShoutout.create" });
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("Unauthorized access attempt", { layer: "controller", context: "controller.clipShoutout.create" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const request = createClipShoutoutSchema.parse(req.body);
            const created = await this.clipShoutoutService.create(request);
            logger.info("Successfully created clip shoutout", { layer: "controller", context: "controller.clipShoutout.create", data: { userId: user.id } });
            res.status(201).send(created);
        } catch (error) {
            if (error instanceof z.ZodError) {
                logger.warn("Validation error", { layer: "controller", context: "controller.clipShoutout.create", error: error.issues });
                return res.status(400).send({ message: "Validation Error", errors: error.issues });
            }
            logger.error("Failed to create clip shoutout", { layer: "controller", context: "controller.clipShoutout.create", data: { userId: user.id }, error });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async delete(req: FastifyRequest, res: FastifyReply) {
        logger.info("Deleting clip shoutout config", { layer: "controller", context: "controller.clipShoutout.delete" });
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("Unauthorized access attempt", { layer: "controller", context: "controller.clipShoutout.delete" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            await this.clipShoutoutService.delete(user.id);
            this.clipShoutoutEventController.disconnectUser(user.id);
            logger.info("Successfully deleted clip shoutout", { layer: "controller", context: "controller.clipShoutout.delete", data: { userId: user.id } });
            res.status(204).send();
        } catch (error) {
            logger.error("Failed to delete clip shoutout", { layer: "controller", context: "controller.clipShoutout.delete", data: { userId: user.id }, error });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async refreshKey(req: FastifyRequest, res: FastifyReply) {
        logger.info("Refreshing overlay key", { layer: "controller", context: "controller.clipShoutout.refreshKey" });
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("Unauthorized access attempt", { layer: "controller", context: "controller.clipShoutout.refreshKey" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const updated = await this.clipShoutoutService.refreshOverlayKey(user.id);
            this.clipShoutoutEventController.disconnectUser(user.id);
            logger.info("Successfully refreshed overlay key", { layer: "controller", context: "controller.clipShoutout.refreshKey", data: { userId: user.id } });
            res.send(updated);
        } catch (error) {
            logger.error("Failed to refresh overlay key", { layer: "controller", context: "controller.clipShoutout.refreshKey", data: { userId: user.id }, error });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }
}
