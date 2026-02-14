import Configurations from "@/config/index";
import redis, { TTL } from "@/libs/redis";
import { twitchAppAPI } from "@/libs/twurple";
import AuthRepository from "@/repositories/auth/auth.repository";
import { CreateUserRequest } from "@/repositories/user/request";
import UserRepository from "@/repositories/user/user.repository";
import { exchangeCode, getTokenInfo } from "@twurple/auth";
import crypto from "crypto";
import { User } from "generated/prisma/client";
import jwt from "jsonwebtoken";
import TLogger, { Layer } from "@/logging/logger";
import { LoginRequest } from "./request";

export default class UserService {
    private readonly cfg: Configurations
    private readonly userRepository: UserRepository
    private readonly authRepository: AuthRepository
    private readonly logger: TLogger

    constructor(cfg: Configurations, userRepository: UserRepository, authRepository: AuthRepository) {
        this.cfg = cfg
        this.userRepository = userRepository
        this.authRepository = authRepository
        this.logger = new TLogger(Layer.SERVICE)
    }

    async login(request: LoginRequest): Promise<{ accessToken: string, refreshToken: string, user: User }> {
        this.logger.setContext("service.user.login")
        const token = await exchangeCode(
            this.cfg.twitch.clientId,
            this.cfg.twitch.clientSecret,
            request.code,
            this.cfg.twitch.redirectUrl
        )

        this.logger.debug({ message: "Received twitch token" });

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
        this.logger.debug({ message: "Creating user request", data: cr });
        const user = await this.userRepository.upsert(cr)
        this.logger.info({ message: "User logged in/created", data: { userId: user.id, username: user.username } });
        try {
            await this.authRepository.create(user.id)
        } catch (error) {

        }
        this.logger.debug({ message: "Updating twitch token", data: { userId: user.id } });
        await this.authRepository.updateTwitchToken(user.id, {
            twitch_refresh_token: token.refreshToken,
            twitch_token_expires_at: token.expiresIn ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
        })

        const accessToken = jwt.sign(
            { id: user.id, username: user.username, displayName: user.display_name, avatarUrl: user.avatar_url, twitchId: user.twitch_id },
            this.cfg.jwtSecret,
            { expiresIn: "15m" }
        );
        const refreshToken = crypto.randomBytes(40).toString("hex");

        redis.set(`refresh_token:${refreshToken}`, user.id, TTL.WEEK);
        redis.set(`auth:twitch_access_token:twitch_id:${user.twitch_id}`, token.accessToken, TTL.WEEK)

        return { accessToken, refreshToken, user };
    }

    async refreshToken(refreshToken: string): Promise<{ accessToken: string, refreshToken: string }> {
        const userId = await redis.get(`refresh_token:${refreshToken}`);

        if (!userId) {
            throw new Error("Invalid refresh token");
        }

        const user = await this.userRepository.get(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const newAccessToken = jwt.sign(
            { id: user.id, username: user.username, displayName: user.display_name, avatarUrl: user.avatar_url, twitchId: user.twitch_id },
            this.cfg.jwtSecret,
            { expiresIn: "15m" }
        );
        const newRefreshToken = crypto.randomBytes(40).toString("hex");

        await redis.del(`refresh_token:${refreshToken}`);
        await redis.set(`refresh_token:${newRefreshToken}`, user.id, { EX: 60 * 60 * 24 * 7 });

        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }

    async logout(userId: string): Promise<void> {
        const user = await this.userRepository.get(userId);
        if (!user) {
            throw new Error("User not found");
        }
        await this.authRepository.updateTwitchToken(user.id, {
            twitch_refresh_token: null,
            twitch_token_expires_at: null,
        })
        const cacheKey = `auth:twitch_access_token:twitch_id:${user.twitch_id}`;
        await redis.del(cacheKey);
    }

    createAccessToken(user: User): string {
        const accessToken = jwt.sign(
            {
                id: user.id,
                username: user.username,
                displayName: user.display_name,
                avatarUrl: user.avatar_url,
                twitchId: user.twitch_id
            },
            this.cfg.jwtSecret,
            { expiresIn: "15m" }
        );
        return accessToken;
    }
}
