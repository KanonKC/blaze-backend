import { FastifyReply, FastifyRequest } from "fastify";
import FirstWordService from "@/services/firstWord/firstWord.service";
import FirstWordEventController from "./firstWord.event.controller";
import { getUserFromRequest } from "../middleware";
import { createFirstWordSchema, updateFirstWordSchema } from "./schemas";
import { z } from "zod";
import logger from "@/libs/winston";

export default class FirstWordController {
    private firstWordService: FirstWordService;
    private firstWordEventController: FirstWordEventController;

    constructor(firstWordService: FirstWordService, firstWordEventController: FirstWordEventController) {
        this.firstWordService = firstWordService;
        this.firstWordEventController = firstWordEventController;
    }

    async get(req: FastifyRequest, res: FastifyReply) {
        logger.info("controller.firstWord.get: Getting first word config");
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("controller.firstWord.get: Unauthorized access attempt");
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const firstWord = await this.firstWordService.getByUserId(user.id);
            if (!firstWord) {
                logger.info("controller.firstWord.get: First word not enabled", { userId: user.id });
                return res.status(404).send({ message: "First word not enabled" });
            }
            logger.info("controller.firstWord.get: Successfully retrieved first word", { userId: user.id });
            res.send(firstWord);
        } catch (error) {
            logger.error("controller.firstWord.get: Failed to get first word", { error, userId: user.id });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async update(req: FastifyRequest, res: FastifyReply) {
        logger.info("controller.firstWord.update: Updating first word config");
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("controller.firstWord.update: Unauthorized access attempt");
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const request = updateFirstWordSchema.parse(req.body);
            const updated = await this.firstWordService.update(user.id, request);
            logger.info("controller.firstWord.update: Successfully updated first word", { userId: user.id });
            res.send(updated);
        } catch (error) {
            if (error instanceof z.ZodError) {
                logger.warn("controller.firstWord.update: Validation error", { error: error.message });
                return res.status(400).send({ message: "Validation Error", errors: error.message });
            }
            logger.error("controller.firstWord.update: Failed to update first word", { error, userId: user.id });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async create(req: FastifyRequest, res: FastifyReply) {
        logger.info("controller.firstWord.create: Creating first word config");
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("controller.firstWord.create: Unauthorized access attempt");
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const request = createFirstWordSchema.parse(req.body);
            const created = await this.firstWordService.create(request);
            logger.info("controller.firstWord.create: Successfully created first word", { userId: user.id });
            res.status(201).send(created);
        } catch (error) {
            if (error instanceof z.ZodError) {
                logger.warn("controller.firstWord.create: Validation error", { error: error.issues });
                return res.status(400).send({ message: "Validation Error", errors: error.issues });
            }
            console.log(error);
            logger.error("controller.firstWord.create: Failed to create first word", { error, userId: user.id });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async delete(req: FastifyRequest, res: FastifyReply) {
        logger.info("controller.firstWord.delete: Deleting first word config");
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("controller.firstWord.delete: Unauthorized access attempt");
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            await this.firstWordService.delete(user.id);
            logger.info("controller.firstWord.delete: Successfully deleted first word", { userId: user.id });
            res.status(204).send();
        } catch (error) {
            logger.error("controller.firstWord.delete: Failed to delete first word", { error, userId: user.id });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async refreshKey(req: FastifyRequest, res: FastifyReply) {
        logger.info("controller.firstWord.refreshKey: Refreshing overlay key");
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("controller.firstWord.refreshKey: Unauthorized access attempt");
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const updated = await this.firstWordService.refreshOverlayKey(user.id);
            this.firstWordEventController.disconnectUser(user.id);
            logger.info("controller.firstWord.refreshKey: Successfully refreshed overlay key", { userId: user.id });
            res.send(updated);
        } catch (error) {
            logger.error("controller.firstWord.refreshKey: Failed to refresh overlay key", { error, userId: user.id });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async uploadAudio(req: FastifyRequest, res: FastifyReply) {
        logger.info("controller.firstWord.uploadAudio: Uploading audio file");
        const user = getUserFromRequest(req);
        if (!user) {
            logger.warn("controller.firstWord.uploadAudio: Unauthorized access attempt");
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const file = await req.file();
            if (!file) {
                logger.warn("controller.firstWord.uploadAudio: No file provided", { userId: user.id });
                return res.status(400).send({ message: "File is required" });
            }
            const buffer = await file.toBuffer();
            await this.firstWordService.uploadAudio(user.id, {
                buffer,
                filename: file.filename,
                mimetype: file.mimetype
            });
            logger.info("controller.firstWord.uploadAudio: Successfully uploaded audio", { userId: user.id, filename: file.filename });
            res.status(201).send();
        } catch (error) {
            logger.error("controller.firstWord.uploadAudio: Failed to upload audio", { error, userId: user.id });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

}
