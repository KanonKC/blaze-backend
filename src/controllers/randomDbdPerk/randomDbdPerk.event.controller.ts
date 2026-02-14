import { FastifyReply, FastifyRequest } from "fastify";
import { subscriber } from "@/libs/redis";
import RandomDbdPerkService from "@/services/randomDbdPerk/randomDbdPerk.service";
import TLogger, { Layer } from "@/logging/logger";

export default class RandomDbdPerkEventController {
    private randomDbdPerkService: RandomDbdPerkService;
    private readonly logger: TLogger;

    constructor(randomDbdPerkService: RandomDbdPerkService) {
        this.randomDbdPerkService = randomDbdPerkService;
        this.logger = new TLogger(Layer.EVENT_CONTROLLER);
    }
    // Map of userId -> Set of connections
    private connections: Map<string, Set<FastifyReply>> = new Map();

    async sse(req: FastifyRequest<{ Params: { userId: string }, Querystring: { key: string } }>, res: FastifyReply) {
        this.logger.setContext("controller.randomDbdPerkEvent.sse");
        const { userId } = req.params;
        const { key } = req.query;

        this.logger.info({ message: "SSE connection attempt", data: { userId } });

        const isValid = await this.randomDbdPerkService.validateOverlayAccess(userId, key);
        if (!isValid) {
            this.logger.warn({ message: "Invalid key for SSE connection", data: { userId } });
            return res.status(401).send({ message: "Invalid overlay key" });
        }

        res.sse({
            event: "connected",
            data: "connected"
        });

        // Track connection
        if (!this.connections.has(userId)) {
            this.connections.set(userId, new Set());
        }
        this.connections.get(userId)!.add(res);

        const sub = subscriber.duplicate();
        await sub.connect();

        await sub.subscribe("random-dbd-perk", (message) => {
            try {
                const payload = JSON.parse(message);
                if (payload.userId === userId) {
                    res.sse({
                        event: "perks",
                        data: JSON.stringify({
                            perks: payload.perks,
                            type: payload.type
                        })
                    });
                }
            } catch (error) {
                this.logger.error({ message: "Failed to parse redis message", error: error as Error });
            }
        });

        req.raw.on("close", () => {
            sub.quit();
            const userConns = this.connections.get(userId);
            if (userConns) {
                userConns.delete(res);
                if (userConns.size === 0) {
                    this.connections.delete(userId);
                }
            }
        });
    }

    public disconnectUser(userId: string) {
        this.logger.setContext("controller.randomDbdPerkEvent.disconnectUser");
        const userConns = this.connections.get(userId);
        if (userConns) {
            this.logger.info({ message: "Disconnecting clients", data: { userId, clientCount: userConns.size } });
            for (const res of userConns) {
                res.raw.end();
            }
            this.connections.delete(userId);
        }
    }
}
