import UserService from "@/services/user/user.service";
import { FastifyReply, FastifyRequest } from "fastify";
import { LoginQuery } from "./request";

export default class UserController {

    private readonly userService: UserService;

    constructor(userService: UserService) {
        this.userService = userService;
    }

    async login(req: FastifyRequest<{ Querystring: LoginQuery }>, res: FastifyReply) {
        console.log(req.query)
        const request = {
            code: req.query.code,
            state: req.query.state,
            scope: req.query.scope.split(" ")
        }
        const response = await this.userService.login(request);
        res.status(201).send(response)
    }
}
