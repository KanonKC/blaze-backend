import { exchangeCode, getTokenInfo } from "@twurple/auth";
import Configurations from "@/config/index";
import { LoginRequest } from "./request";
import { twitchAppAPI } from "@/libs/twurple";
import UserRepository from "@/repositories/user/user.repository";
import { CreateUserRequest } from "@/repositories/user/request";
import jwt from "jsonwebtoken";
import redis from "@/libs/redis";
import crypto from "crypto";
import { User } from "generated/prisma/client";

export default class UserService {
    private readonly cfg: Configurations
    private readonly userRepository: UserRepository

    constructor(cfg: Configurations, userRepository: UserRepository) {
        this.cfg = cfg
        this.userRepository = userRepository
    }

    async login(request: LoginRequest): Promise<{ accessToken: string, refreshToken: string, user: User }> {
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
        const user = await this.userRepository.upsert(cr)

        const accessToken = jwt.sign(
            { id: user.id, username: user.username, displayName: user.display_name, avatarUrl: user.avatar_url, twitchId: user.twitch_id },
            process.env.JWT_SECRET || "secret",
            { expiresIn: "15m" }
        );
        const refreshToken = crypto.randomBytes(40).toString("hex");

        await redis.set(`refresh_token:${refreshToken}`, user.id, { EX: 60 * 60 * 24 * 7 });

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
            process.env.JWT_SECRET || "secret",
            { expiresIn: "15m" }
        );
        const newRefreshToken = crypto.randomBytes(40).toString("hex");

        await redis.del(`refresh_token:${refreshToken}`);
        await redis.set(`refresh_token:${newRefreshToken}`, user.id, { EX: 60 * 60 * 24 * 7 });

        return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    }
}
