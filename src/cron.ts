import { CronJob } from "cron";
import UserService from "./services/user/user.service";

export default class TbCron {

    private readonly userService: UserService

    constructor(userService: UserService) {
        this.userService = userService
    }

    async run() {
        CronJob.from({
            cronTime: "44 20 * * *",
            onTick: () => this.userService.bulkAdjustTierAndWidgets(),
            start: true,
            timeZone: "Asia/Bangkok"
        })
    }
}