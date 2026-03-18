import { TError } from "@/errors";

export class WidgetQuotaLimitError extends TError {
    constructor(message?: string) {
        super({ message: message ?? "Widget quota limit reached", status: 402 })
    }
}