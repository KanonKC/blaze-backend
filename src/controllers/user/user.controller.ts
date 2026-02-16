import UserService from "@/services/user/user.service";
import { FastifyReply, FastifyRequest } from "fastify";
import { getUserFromRequest } from "../middleware";
import { LoginQuery } from "./request";
import { loginSchema } from "./schemas";
import { z } from "zod";

import Configurations from "@/config/index";
import TLogger, { Layer } from "@/logging/logger";
import { verifyToken } from "@/libs/jwt";
import { TError } from "@/errors";

export default class UserController {

    private readonly cfg: Configurations;
    private readonly userService: UserService;
    private readonly logger: TLogger;

    constructor(cfg: Configurations, userService: UserService) {
        this.cfg = cfg;
        this.userService = userService;
        this.logger = new TLogger(Layer.CONTROLLER);
    }

    async login(req: FastifyRequest<{ Querystring: LoginQuery }>, res: FastifyReply) {
        this.logger.setContext("controller.user.login");
        this.logger.info({ message: "Login attempt initiated" });
        try {
            const query = loginSchema.parse(req.query);
            const request = {
                code: query.code,
                state: query.state,
                scope: query.scope.split(" ")
            };

            const { accessToken, refreshToken, user } = await this.userService.login(request);

            res.setCookie('accessToken', accessToken, {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                maxAge: 60 * 15 // 15 minutes
            });

            res.setCookie('refreshToken', refreshToken, {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 7 days
            });
            res.redirect(this.cfg.frontendOrigin);
            this.logger.info({ message: "Login successful", data: user });
        } catch (err) {
            if (err instanceof z.ZodError) {
                this.logger.warn({ message: "Validation error", data: req.query, error: err.message });
                return res.status(400).send({ message: "Validation Error", errors: err.issues });
            }
            if (err instanceof TError) {
                this.logger.error({ message: err.message, data: req.query, error: err });
                return res.status(err.code).send({ message: err.message });
            }
            this.logger.error({ message: "Login failed", data: req.query, error: err as Error | string });
            res.status(500).send({ message: "Internal Server Error" });
        }
    }

    async me(req: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("controller.user.me");
        this.logger.info({ message: "Getting current user info" });
        const token = req.cookies.accessToken;
        if (!token) {
            this.logger.warn({ message: "No access token provided" });
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const decoded = verifyToken(token);
            this.logger.info({ message: "Successfully retrieved user info", data: decoded });
            res.send(decoded);
        } catch (err) {
            this.logger.warn({ message: "Invalid token", error: err as string | Error });
            return res.status(401).send({ message: "Invalid token" });
        }
    }

    async logout(req: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("controller.user.logout");
        this.logger.info({ message: "User logging out" });
        const user = getUserFromRequest(req);
        if (!user) {
            this.logger.warn({ message: "No access token provided" });
            return res.status(401).send({ message: "Unauthorized" });
        }
        try {
            await this.userService.logout(user.id);
            res.clearCookie('accessToken', { path: '/' });
            res.clearCookie('refreshToken', { path: '/' });
            this.logger.info({ message: "Successfully logged out" });
            res.status(200).send({ message: "Logged out" });
        } catch (err) {
            if (err instanceof TError) {
                this.logger.error({ message: err.message, error: err });
                return res.status(err.code).send({ message: err.message });
            }
            this.logger.error({ message: "Logout failed", error: err as string | Error });
            return res.status(500).send({ message: "Logout failed" });
        }
    }

    async refresh(req: FastifyRequest, res: FastifyReply) {
        this.logger.setContext("controller.user.refresh");
        this.logger.info({ message: "Token refresh requested" });
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
            this.logger.warn({ message: "No refresh token provided" });
            return res.status(401).send({ message: "No refresh token" });
        }

        try {
            const tokens = await this.userService.refreshToken(refreshToken);

            res.setCookie('accessToken', tokens.accessToken, {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                maxAge: 60 * 15 // 15 minutes
            });

            res.setCookie('refreshToken', tokens.refreshToken, {
                path: '/',
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 // 7 days
            });

            this.logger.info({ message: "Token refreshed successfully" });
            res.send({ message: "Token refreshed" });
        } catch (err) {
            if (err instanceof TError) {
                this.logger.error({ message: err.message, error: err });
                res.clearCookie('accessToken', { path: '/' });
                res.clearCookie('refreshToken', { path: '/' });
                return res.status(err.code).send({ message: err.message });
            }
            this.logger.error({ message: "Token refresh failed", error: err as string | Error });
            res.clearCookie('accessToken', { path: '/' });
            res.clearCookie('refreshToken', { path: '/' });
            res.status(401).send({ message: "Invalid refresh token" });
        }
    }
}
