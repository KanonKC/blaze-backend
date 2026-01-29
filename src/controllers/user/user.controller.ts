import UserService from "@/services/user/user.service";
import { FastifyReply, FastifyRequest } from "fastify";
import { verifyToken } from "../middleware";
import { LoginQuery } from "./request";

import logger from "@/libs/winston";

export default class UserController {

    private readonly userService: UserService;

    constructor(userService: UserService) {
        this.userService = userService;
    }

    async login(req: FastifyRequest<{ Querystring: LoginQuery }>, res: FastifyReply) {
        const request = {
            code: req.query.code,
            state: req.query.state,
            scope: req.query.scope.split(" ")
        }
        logger.info("Login attempt initiated", { code: request.code });
        try {
            const { accessToken, refreshToken, user } = await this.userService.login(request);

            res.setCookie('accessToken', accessToken, {
                path: '/',
                httpOnly: true,
                secure: true, // Should be true in production, maybe false for local dev depending on setup
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
            res.redirect("http://localhost:3000"); // Redirect to frontend
            logger.info("Login successful", user); // Note: accessToken might be long/sensitive, consider decoding ID or just saying success
        } catch (err) {
            logger.error("Login failed", { error: err });
            res.status(400).send({ message: String(err) })
        }
    }

    async me(req: FastifyRequest, res: FastifyReply) {
        const token = req.cookies.accessToken;
        console.log('token', token)
        if (!token) {
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            console.log('token', token)
            const decoded = verifyToken(token);
            console.log('decoded', decoded)
            // In a real app, you might want to fetch fresh user data from DB here
            // For now, returning the decoded payload (which contains id and username) is enough check
            res.send(decoded);
        } catch (err) {
            console.log('err', err)
            return res.status(401).send({ message: "Invalid token" });
        }
    }

    async logout(_: FastifyRequest, res: FastifyReply) {
        res.clearCookie('accessToken', { path: '/' });
        res.clearCookie('refreshToken', { path: '/' });
        res.status(200).send({ message: "Logged out" });
    }

    async refresh(req: FastifyRequest, res: FastifyReply) {
        const { refreshToken } = req.cookies;
        if (!refreshToken) {
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

            res.send({ message: "Token refreshed" });
        } catch (err) {
            logger.error("Token refresh failed", { error: err });
            res.clearCookie('accessToken', { path: '/' });
            res.clearCookie('refreshToken', { path: '/' });
            res.status(401).send({ message: "Invalid refresh token" });
        }
    }
}
