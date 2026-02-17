import { prisma } from "@/libs/prisma";
import { Auth } from "../../../generated/prisma/client";
import AuthRepository from "@/repositories/auth/auth.repository";
import redis, { TTL } from "@/libs/redis";
import { createTwitchUserAPI } from "@/libs/twurple";
import { refreshUserToken } from "@twurple/auth";
import Configurations from "@/config/index";
import { ApiClient } from "@twurple/api";
import UserRepository from "@/repositories/user/user.repository";
import { rawDataSymbol } from "@twurple/common";
import UserService from "../user/user.service";
import TLogger, { Layer } from "@/logging/logger";
import { UnauthorizedError, NotFoundError } from "@/errors";

const logger = new TLogger(Layer.SERVICE);

export default class AuthService {
    private cfg: Configurations
    private authRepository: AuthRepository;
    private userRepository: UserRepository;
    private userService: UserService;
    constructor(cfg: Configurations, authRepository: AuthRepository, userRepository: UserRepository, userService: UserService) {
        this.cfg = cfg
        this.authRepository = authRepository;
        this.userRepository = userRepository;
        this.userService = userService;
    }

    private async getTwitchAccessToken(twitchId: string): Promise<string> {
        logger.setContext("service.auth.getTwitchAccessToken");
        logger.info({ message: "getTwitchAccessToken", data: { twitchId } });
        const cacheKey = `auth:twitch_access_token:twitch_id:${twitchId}`;
        let token = await redis.get(cacheKey);
        console.log('token', token)
        if (token) {
            // Validate token
            const twitchUserAPI = createTwitchUserAPI(token)
            console.log('twitchUserAPI', twitchUserAPI)
            try {

                const tokenInfo = await twitchUserAPI.getTokenInfo()
                console.log('tokenInfo', tokenInfo)
                logger.info({ message: "tokenInfo", data: tokenInfo[rawDataSymbol] });
                // If valid return token
                if (!tokenInfo.expiryDate || tokenInfo.expiryDate > new Date()) {
                    return token
                }
                // Delete invalid token
            } catch (error) {
                logger.error({ message: "Error on getTwitchAccessToken", error: error as Error });
            }
            // Otherwise continue
            await redis.del(cacheKey)
        }
        // Generate token from refresh token
        const now = new Date()
        let auth: Auth | null = null
        const user = await this.userRepository.getByTwitchId(twitchId)
        console.log('user', user)
        logger.info({ message: "user", data: user });
        if (!user) {
            throw new NotFoundError("User not found");
        }
        auth = user.auth;
        logger.info({ message: "auth", data: auth });
        if (!auth) {
            auth = await this.authRepository.create(user.id)
        }
        if (!auth.twitch_refresh_token || (auth.twitch_token_expires_at && now > auth.twitch_token_expires_at)) {
            await this.userService.logout(user.id)
            throw new UnauthorizedError("Refresh token not found or expired");
        }
        const newToken = await refreshUserToken(
            this.cfg.twitch.clientId,
            this.cfg.twitch.clientSecret,
            auth.twitch_refresh_token
        )
        logger.info({ message: "newToken", data: newToken });
        try {
            await this.authRepository.updateTwitchToken(auth.id, {
                twitch_refresh_token: newToken.refreshToken,
                twitch_token_expires_at: newToken.expiresIn ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null
            })
        } catch (error) {
            logger.error({ message: "Error on updateTwitchToken", error: error as Error });
        }
        await redis.set(cacheKey, newToken.accessToken, TTL.QUARTER_HOUR)
        return newToken.accessToken
    }

    async createTwitchUserAPI(userId: string): Promise<ApiClient> {
        const token = await this.getTwitchAccessToken(userId)
        return createTwitchUserAPI(token)
    }

}