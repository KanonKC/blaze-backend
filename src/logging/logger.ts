import logger from "@/libs/winston"
import { User } from "generated/prisma/client"

export enum Layer {
    CONTROLLER = "controller",
    SERVICE = "service",
    MIDDLEWARE = "middleware",
    REPOSITORY = "repository",
    EVENT = "event",
    EVENT_CONTROLLER = "event-controller",
    OTHER = "other"
}

interface LogMeta {
    message: string,
    data?: any,
    user?: User
    error?: Error | string
}

export default class TLogger {
    private readonly layer: Layer
    private context: string
    constructor(layer: Layer) {
        this.layer = layer
        this.context = ""
    }

    public setContext(context: string): TLogger {
        this.context = context
        return this
    }

    public info(meta: LogMeta): void {
        logger.info(meta.message, { layer: this.layer, context: this.context, user: meta.user, error: meta.error, data: meta.data })
    }

    public error(meta: LogMeta): void {
        logger.error(meta.message, { layer: this.layer, context: this.context, user: meta.user, error: meta.error, data: meta.data })
    }

    public warn(meta: LogMeta): void {
        logger.warn(meta.message, { layer: this.layer, context: this.context, user: meta.user, error: meta.error, data: meta.data })
    }

    public debug(meta: LogMeta): void {
        logger.debug(meta.message, { layer: this.layer, context: this.context, user: meta.user, error: meta.error, data: meta.data })
    }

}