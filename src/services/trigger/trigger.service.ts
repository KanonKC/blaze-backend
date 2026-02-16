import TLogger, { Layer } from "@/logging/logger";
import { CreateTriggerRequest } from "@/repositories/trigger/request";
import TriggerRepository from "@/repositories/trigger/trigger.repository";
import UserRepository from "@/repositories/user/user.repository";
import WorkflowRepository from "@/repositories/workflow/workflow.repository";
import { Trigger } from "generated/prisma/client";
import UserService from "../user/user.service";
import WorkflowService from "../workflow/workflow.service";
import { CreateByTwitchEventSubRequest } from "./request";
import { NotFoundError } from "@/errors";

export default class TriggerService {
    private logger = new TLogger(Layer.SERVICE);
    private readonly triggerRepository: TriggerRepository
    private readonly workflowRepository: WorkflowRepository
    private readonly workflowService: WorkflowService
    private readonly userRepository: UserRepository

    constructor(triggerRepository: TriggerRepository, workflowRepository: WorkflowRepository, workflowService: WorkflowService, userRepository: UserRepository) {
        this.triggerRepository = triggerRepository
        this.workflowRepository = workflowRepository
        this.workflowService = workflowService
        this.userRepository = userRepository
    }

    async createByTwitchEventSub(e: any): Promise<Trigger> {
        this.logger.setContext("service.trigger.createByTwitchEventSub");
        const user = await this.userRepository.getByTwitchId(e.subscription.condition.broadcaster_user_id)
        if (!user) {
            this.logger.error({ message: "User not found" });
            throw new NotFoundError("User not found");
        }
        const cr: CreateTriggerRequest = {
            id: e.subscription.id,
            type: e.subscription.type,
            platform: "twitch",
            user_id: user.id,
        }
        return this.triggerRepository.create(cr)
    }

    async get(id: string): Promise<Trigger | null> {
        this.logger.setContext("service.trigger.get");
        const trigger = await this.triggerRepository.get(id)
        if (!trigger) {
            this.logger.error({ message: "Trigger not found" });
            throw new NotFoundError("Trigger not found");
        }
        return trigger
    }

    async triggerWorkflows(id: string): Promise<void> {
        this.logger.setContext("service.trigger.triggerWorkflows");
        const trigger = await this.triggerRepository.get(id)
        if (!trigger) {
            this.logger.error({ message: "Trigger not found" });
            throw new NotFoundError("Trigger not found");
        }
        const workflows = await this.workflowRepository.getManyByTriggerId(trigger.id)
        for (const workflow of workflows) {
            this.workflowService.execute(workflow)
        }
    }
}