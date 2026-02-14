import { FastifyReply, FastifyRequest } from "fastify";
import { TwitchChannelChatMessageEventRequest } from "./request";
import FirstWordService from "@/services/firstWord/firstWord.service";
import TLogger, { Layer } from "@/logging/logger";

export default class TwitchChannelChatMessageEvent {

    private readonly firstWordService: FirstWordService;
    private readonly logger: TLogger;

    constructor(firstWordService: FirstWordService) {
        this.firstWordService = firstWordService;
        this.logger = new TLogger(Layer.EVENT);
    }

    async handle(req: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("event.twitch.channelChatMessage.handle");
        const body = req.body as any

        if (body.subscription.status === "webhook_callback_verification_pending") {
            this.logger.info({ message: "Verifying webhook callback", data: { challenge: body.challenge } });
            res.status(200).header("Content-Type", "text/plain").send(body.challenge)
            return
        }

        const event = body.event as TwitchChannelChatMessageEventRequest

        if (body.subscription.status === "enabled") {
            // this.logger.info({ message: "Handling chat message event", data: { broadcasterUserId: event.broadcaster_user_id, chatterUserId: event.chatter_user_id } });
            this.firstWordService.greetNewChatter(event)
            res.status(204).send()
            return
        }

        this.logger.warn({ message: "Invalid subscription status", data: { status: body.subscription.status } });
        res.status(400).send({ message: "Invalid subscription status" })
    }
}