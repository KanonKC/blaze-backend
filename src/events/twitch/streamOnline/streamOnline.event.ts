import { FastifyReply, FastifyRequest } from "fastify"
import { TwitchStreamOnlineEventRequest } from "./request"
import FirstWordService from "@/services/firstWord/firstWord.service"

export default class TwitchStreamOnlineEvent {
    private readonly firstWordService: FirstWordService;

    constructor(firstWordService: FirstWordService) {
        this.firstWordService = firstWordService;
    }

    async handle(req: FastifyRequest, res: FastifyReply) {

        const body = req.body as any

        if (body.subscription.status === "webhook_callback_verification_pending") {
            res.status(200).header("Content-Type", "text/plain").send(body.challenge)
            return
        }

        const event = body.event as TwitchStreamOnlineEventRequest

        if (body.subscription.status === "enabled") {
            this.firstWordService.resetChatters(event)
            res.status(204).send()
            return
        }

        res.status(400).send({ message: "Invalid subscription status" })
    }
}