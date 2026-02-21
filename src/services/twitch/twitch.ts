import { HelixCustomRewardData } from "@twurple/api/lib/interfaces/endpoints/channelPoints.external";
import { rawDataSymbol } from "@twurple/common";
import AuthService from "../auth/auth.service";

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
}