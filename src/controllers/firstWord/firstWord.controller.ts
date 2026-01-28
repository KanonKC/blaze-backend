import { FastifyReply, FastifyRequest } from "fastify";
import FirstWordService from "@/services/firstWord/firstWord.service";
import { CreateFirstWordRequest, UpdateFirstWordRequest } from "@/repositories/firstWord/request";
import { getUserFromRequest } from "../middleware";

export default class FirstWordController {
    private firstWordService: FirstWordService;

    constructor(firstWordService: FirstWordService) {
        this.firstWordService = firstWordService;
    }

    async get(req: FastifyRequest, res: FastifyReply) {
        const user = getUserFromRequest(req);
        console.log(user);
        if (!user) return res.status(401).send({ message: "Unauthorized" });

        try {
            const firstWord = await this.firstWordService.getByUserId(user.id);
            if (!firstWord) {
                return res.status(404).send({ message: "First word not enabled" });
            }
            res.send(firstWord);
        } catch (error) {
            console.error(error);
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async update(req: FastifyRequest, res: FastifyReply) {
        const user = getUserFromRequest(req);
        if (!user) return res.status(401).send({ message: "Unauthorized" });

        try {
            const request = req.body as UpdateFirstWordRequest;
            const updated = await this.firstWordService.update(user.id, request);
            res.send(updated);
        } catch (error) {
            console.error(error);
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async create(req: FastifyRequest, res: FastifyReply) {
        try {
            const request = req.body as CreateFirstWordRequest;
            await this.firstWordService.create(request);
            res.status(201).send();
        } catch (error) {
            console.error(error);
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async uploadAudio(req: FastifyRequest, res: FastifyReply) {
        const user = getUserFromRequest(req);
        if (!user) return res.status(401).send({ message: "Unauthorized" });

        try {
            const file = await req.file();
            if (!file) {
                return res.status(400).send({ message: "File is required" });
            }
            const buffer = await file.toBuffer();
            await this.firstWordService.uploadAudio(user.id, {
                buffer,
                filename: file.filename,
                mimetype: file.mimetype
            });
            res.status(201).send();
        } catch (error) {
            console.error(error);
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

}
