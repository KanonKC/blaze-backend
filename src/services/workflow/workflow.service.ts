import TLogger, { Layer } from "@/logging/logger";
import { createESTransport, twitchAppAPI } from "@/libs/twurple";
import WorkflowRepository from "@/repositories/workflow/workflow.repository";
import { Workflow } from "generated/prisma/client";
import { NotFoundError } from "@/errors";

export default class WorkflowService {
    private logger = new TLogger(Layer.SERVICE);
    private workflowRepository: WorkflowRepository
    constructor(workflowRepository: WorkflowRepository) {
        this.workflowRepository = workflowRepository
    }

    async publish(id: string) {
        this.logger.setContext("service.workflow.publish");
        const owner = await this.workflowRepository.getOwner(id)
        if (!owner) {
            this.logger.error({ message: "Workflow not found" });
            throw new NotFoundError("Workflow not found");
        }
        const tsp = createESTransport("/webhook/v1/twitch/event-sub/chat-message-events")
        const eventSub = await twitchAppAPI.eventSub.subscribeToChannelChatMessageEvents(owner.twitch_id, tsp)
    }

    async execute(workflow: Workflow) {
        this.logger.setContext("service.workflow.execute");
        // Execution logic to be implemented
    }
}