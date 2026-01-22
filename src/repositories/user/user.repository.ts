import { User } from "../../../generated/prisma/client";
import { CreateUserRequest } from "./request";
import { prisma } from "@/libs/prisma";

export default class UserRepository {
    constructor() { }

    async create(request: CreateUserRequest): Promise<User> {
        return prisma.user.create({
            data: request
        })
    }
}