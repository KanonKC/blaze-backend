import { FastifyReply, FastifyRequest } from "fastify";
import { subscriber } from "@/libs/redis";
import ClipShoutoutService from "@/services/clipShoutout/clipShoutout.service";
import logger from "@/libs/winston";

export default class ClipShoutoutEventController {
    private clipShoutoutService: ClipShoutoutService;

    constructor(clipShoutoutService: ClipShoutoutService) {
        this.clipShoutoutService = clipShoutoutService;
    }
    // Map of userId -> Set of connections
    private connections: Map<string, Set<FastifyReply>> = new Map();

    // TODO: Make rate limited
    async sse(req: FastifyRequest<{ Params: { userId: string }, Querystring: { key: string } }>, res: FastifyReply) {
        const { userId } = req.params;
        const { key } = req.query;

        logger.info("controller.clipShoutoutEvent.sse: SSE connection attempt", { userId });

        const isValid = await this.clipShoutoutService.validateOverlayAccess(userId, key);
        if (!isValid) {
            logger.warn("controller.clipShoutoutEvent.sse: Invalid key for SSE connection", { userId });
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

        await sub.subscribe("clip-shoutout-clip", (message) => {
            const payload = JSON.parse(message);
            if (payload.userId === userId) {
                res.sse({
                    event: "clip",
                    data: JSON.stringify({ url: payload.url, duration: payload.duration })
                });
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
        const userConns = this.connections.get(userId);
        if (userConns) {
            logger.info("controller.clipShoutoutEvent.disconnectUser: Disconnecting clients", { userId, clientCount: userConns.size });
            for (const res of userConns) {
                res.raw.end();
            }
            this.connections.delete(userId);
        }
    }
}
