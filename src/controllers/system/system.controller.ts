import { FastifyReply, FastifyRequest } from "fastify";
import SystemService from "@/services/system/system.service";
import TLogger, { Layer } from "@/logging/logger";

export default class SystemController {
    private readonly systemService: SystemService;
    private readonly logger: TLogger;

    constructor(systemService: SystemService) {
        this.systemService = systemService;
        this.logger = new TLogger(Layer.CONTROLLER);
    }

    async health(_: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("controller.system.health");
        this.logger.info({ message: "Health check initiated" });
        const health = await this.systemService.getHealth();

        const isHealthy = health.database && Object.values(health.libs).every(x => x);

        if (!isHealthy) {
            this.logger.error({ message: "Health check failed", data: { health } });
            return res.status(503).send(health);
        }

        this.logger.info({ message: "Health check passed", data: { health } });
        res.send(health);
    }
}
