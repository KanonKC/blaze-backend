import { AccessToken, exchangeCode, getTokenInfo } from "@twurple/auth";
import Configurations from "@/config/index";
import { LoginRequest } from "./request";
import { twitchAppAPI } from "@/libs/twurple";
import UserRepository from "@/repositories/user/user.repository";
import { CreateUserRequest } from "@/repositories/user/request";

export default class UserService {
    private readonly cfg: Configurations
    private readonly userRepository: UserRepository
    constructor(cfg: Configurations, userRepository: UserRepository) {
        this.cfg = cfg
        this.userRepository = userRepository
    }

    async login(request: LoginRequest): Promise<AccessToken> {
        const token = await exchangeCode(
            this.cfg.twitch.clientId,
            this.cfg.twitch.clientSecret,
            request.code,
            this.cfg.twitch.redirectUrl
        )

        const tokenInfo = await getTokenInfo(token.accessToken, this.cfg.twitch.clientId)

        if (!tokenInfo.userId) {
            throw new Error("Invalid token info")
        }

        const twitchUser = await twitchAppAPI.users.getUserById(tokenInfo.userId)

        if (!twitchUser) {
            throw new Error("Invalid Twitch user")
        }

        const cr: CreateUserRequest = {
            twitch_id: twitchUser.id,
            username: twitchUser.name,
            display_name: twitchUser.displayName,
            avatar_url: twitchUser.profilePictureUrl
        }
        await this.userRepository.create(cr)

        return token;
    }
}
