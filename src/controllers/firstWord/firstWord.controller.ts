import { FastifyReply, FastifyRequest } from "fastify";
import FirstWordService from "@/services/firstWord/firstWord.service";
import FirstWordEventController from "./firstWord.event.controller";
import { getUserFromRequest } from "../middleware";
import { createFirstWordSchema, updateFirstWordSchema } from "./schemas";
import { z } from "zod";
import TLogger, { Layer } from "@/logging/logger";
import { TError } from "@/errors";

export default class FirstWordController {
    private firstWordService: FirstWordService;
    private firstWordEventController: FirstWordEventController;
    private readonly logger: TLogger;

    constructor(firstWordService: FirstWordService, firstWordEventController: FirstWordEventController) {
        this.firstWordService = firstWordService;
        this.firstWordEventController = firstWordEventController;
        this.logger = new TLogger(Layer.CONTROLLER);
    }

    async get(req: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("controller.firstWord.get");
        this.logger.info({ message: "Getting first word config" });
        const user = getUserFromRequest(req);
        if (!user) {
            this.logger.warn({ message: "Unauthorized access attempt" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const firstWord = await this.firstWordService.getByUserId(user.id);
            this.logger.info({ message: "Successfully retrieved first word", data: { userId: user.id } });
            res.send(firstWord);
        } catch (error) {
            this.logger.error({ message: "Failed to get first word", data: { userId: user.id }, error: error as Error });
            if (error instanceof TError) {
                return res.status(error.code).send({ message: error.message });
            }
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async update(req: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("controller.firstWord.update");
        this.logger.info({ message: "Updating first word config" });
        const user = getUserFromRequest(req);
        if (!user) {
            this.logger.warn({ message: "Unauthorized access attempt" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const request = updateFirstWordSchema.parse(req.body);
            const updated = await this.firstWordService.update(user.id, request);
            this.logger.info({ message: "Successfully updated first word", data: { userId: user.id } });
            res.send(updated);
        } catch (error) {
            this.logger.error({ message: "Failed to update first word", data: { userId: user.id }, error: error as Error });
            if (error instanceof z.ZodError) {
                return res.status(400).send({ message: "Validation Error", errors: error.issues });
            }
            if (error instanceof TError) {
                return res.status(error.code).send({ message: error.message });
            }
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async create(req: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("controller.firstWord.create");
        this.logger.info({ message: "Creating first word config" });
        const user = getUserFromRequest(req);
        if (!user) {
            this.logger.warn({ message: "Unauthorized access attempt" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const request = createFirstWordSchema.parse(req.body);
            const created = await this.firstWordService.create(request);
            this.logger.info({ message: "Successfully created first word", data: { userId: user.id } });
            res.status(201).send(created);
        } catch (error) {
            this.logger.error({ message: "Failed to create first word", data: { userId: user.id }, error: error as Error });
            if (error instanceof z.ZodError) {
                return res.status(400).send({ message: "Validation Error", errors: error.issues });
            }
            if (error instanceof TError) {
                return res.status(error.code).send({ message: error.message });
            }
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async delete(req: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("controller.firstWord.delete");
        this.logger.info({ message: "Deleting first word config" });
        const user = getUserFromRequest(req);
        if (!user) {
            this.logger.warn({ message: "Unauthorized access attempt" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            await this.firstWordService.delete(user.id);
            this.logger.info({ message: "Successfully deleted first word", data: { userId: user.id } });
            res.status(204).send();
        } catch (error) {
            this.logger.error({ message: "Failed to delete first word", data: { userId: user.id }, error: error as Error });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async refreshKey(req: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("controller.firstWord.refreshKey");
        this.logger.info({ message: "Refreshing overlay key" });
        const user = getUserFromRequest(req);
        if (!user) {
            this.logger.warn({ message: "Unauthorized access attempt" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const updated = await this.firstWordService.refreshOverlayKey(user.id);
            this.firstWordEventController.disconnectUser(user.id);
            this.logger.info({ message: "Successfully refreshed overlay key", data: { userId: user.id } });
            res.send(updated);
        } catch (error) {
            this.logger.error({ message: "Failed to refresh overlay key", data: { userId: user.id }, error: error as Error });
            if (error instanceof TError) {
                return res.status(error.code).send({ message: error.message });
            }
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    // async uploadAudio(req: FastifyRequest, res: FastifyReply) {
    //     this.logger.setContext("controller.firstWord.uploadAudio");
    //     this.logger.info({ message: "Uploading audio file" });
    //     const user = getUserFromRequest(req);
    //     if (!user) {
    //         this.logger.warn({ message: "Unauthorized access attempt" });
    //         return res.status(401).send({ message: "Unauthorized" });
    //     }

    //     try {
    //         const file = await req.file();
    //         if (!file) {
    //             this.logger.warn({ message: "No file provided", data: { userId: user.id } });
    //             return res.status(400).send({ message: "File is required" });
    //         }
    //         const buffer = await file.toBuffer();
    //         await this.firstWordService.uploadAudio(user.id, {
    //             buffer,
    //             filename: file.filename,
    //             mimetype: file.mimetype
    //         });
    //         this.logger.info({ message: "Successfully uploaded audio", data: { userId: user.id, filename: file.filename } });
    //         res.status(201).send();
    //     } catch (error) {
    //         this.logger.error({ message: "Failed to upload audio", data: { userId: user.id }, error: error as Error });
    //         if (error instanceof TError) {
    //             return res.status(error.code).send({ message: error.message });
    //         }
    //         res.status(500).send({ message: "Internal Server Error" });
    //     }
    // }

}
