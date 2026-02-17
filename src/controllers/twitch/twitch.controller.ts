import TwitchService from "@/services/twitch/twitch";
import { FastifyReply, FastifyRequest } from "fastify";
import { getUserFromRequest } from "../middleware";
import TLogger, { Layer } from "@/logging/logger";
import { TError } from "@/errors";

export default class TwitchController {
    private twitchService: TwitchService;
    private readonly logger: TLogger;

    constructor(twitchService: TwitchService) {
        this.twitchService = twitchService;
        this.logger = new TLogger(Layer.CONTROLLER);
    }

    async getChannelRewards(req: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("controller.twitch.getChannelRewards");
        const user = getUserFromRequest(req);
        if (!user) {
            this.logger.warn({ message: "Unauthorized access attempt" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const response = await this.twitchService.getChannelRewards(user.twitchId);
            return res.status(200).send(response);
        } catch (error) {
            if (error instanceof TError) {
                this.logger.error({ message: error.message, data: { userId: user.id }, error });
                return res.status(error.code).send({ message: error.message });
            }
            this.logger.error({ message: "Failed to get channel rewards", data: { userId: user.id }, error: error as Error });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }
}