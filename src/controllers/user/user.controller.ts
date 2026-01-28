import UserService from "@/services/user/user.service";
import { FastifyReply, FastifyRequest } from "fastify";
import { LoginQuery } from "./request";
import config from "@/config";
import { verifyToken } from "../middleware";

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
        try {
            const { accessToken, refreshToken } = await this.userService.login(request);

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
        } catch (err) {
            res.status(400).send({ message: String(err) })
        }
    }

    async me(req: FastifyRequest, res: FastifyReply) {
        const token = req.cookies.accessToken;
        if (!token) {
            return res.status(401).send({ message: "Unauthorized" });
        }

        try {
            const decoded = verifyToken(token);
            // In a real app, you might want to fetch fresh user data from DB here
            // For now, returning the decoded payload (which contains id and username) is enough check
            res.send(decoded);
        } catch (err) {
            return res.status(401).send({ message: "Invalid token" });
        }
    }

    async logout(_: FastifyRequest, res: FastifyReply) {
        res.clearCookie('accessToken', { path: '/' });
        res.clearCookie('refreshToken', { path: '/' });
        res.status(200).send({ message: "Logged out" });
    }
}
