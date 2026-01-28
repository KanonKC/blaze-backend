import { FastifyReply, FastifyRequest } from "fastify";
import { subscriber } from "@/libs/redis";

export default class FirstWordEventController {

    async sse(req: FastifyRequest<{ Params: { userId: string } }>, res: FastifyReply) {
        const { userId } = req.params;

        res.sse({
            event: "connected",
            data: "connected"
        });

        const sub = subscriber.duplicate();
        await sub.connect();

        await sub.subscribe("first-word-audio", (message) => {
            const payload = JSON.parse(message);
            if (payload.userId === userId) {
                res.sse({
                    event: "audio",
                    data: JSON.stringify({ url: payload.audioUrl })
                });
            }
        });

        req.raw.on("close", () => {
            sub.quit();
        });
    }
}
