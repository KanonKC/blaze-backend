import { HelixCustomRewardData } from "@twurple/api/lib/interfaces/endpoints/channelPoints.external";
import { rawDataSymbol } from "@twurple/common";
import AuthService from "../auth/auth.service";
import { HelixUserData } from "@twurple/api/lib/interfaces/endpoints/user.external";
import { NotFoundError } from "@/errors";

export default class TwitchService {
    private readonly authService: AuthService;
    constructor(authService: AuthService) {
        this.authService = authService;
    }

    async listChannelRewards(channelId: string): Promise<{
        data: HelixCustomRewardData[];
    }> {
        const twitchUserAPI = await this.authService.createTwitchUserAPI(channelId)
        let res = await twitchUserAPI.channelPoints.getCustomRewards(channelId)
        res = res.sort((a, b) => a.cost - b.cost)
        return { data: res.map(r => r[rawDataSymbol]) }
    }

    async listUsers(userIds: string[]): Promise<{
        data: HelixUserData[];
    }> {
        const twitchUserAPI = await this.authService.createTwitchUserAPI(userIds[0])
        let res = await twitchUserAPI.users.getUsersByIds(userIds)
        return { data: res.map(r => r[rawDataSymbol]) }
    }

    async getUser(userId: string): Promise<HelixUserData> {
        const twitchUserAPI = await this.authService.createTwitchUserAPI(userId)
        let res = await twitchUserAPI.users.getUserById(userId)
        if (!res) {
            throw new NotFoundError("Twitch user not found")
        }
        return res[rawDataSymbol]
    }

    async getUserByName(channelId: string, userName: string): Promise<HelixUserData> {
        const twitchUserAPI = await this.authService.createTwitchUserAPI(channelId)
        let res = await twitchUserAPI.users.getUserByName(userName)
        if (!res) {
            throw new NotFoundError("Twitch user not found")
        }
        return res[rawDataSymbol]
    }
}