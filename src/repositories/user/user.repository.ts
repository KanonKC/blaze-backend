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

    async upsert(request: CreateUserRequest): Promise<User> {
        return prisma.user.upsert({
            where: {
                twitch_id: request.twitch_id
            },
            create: request,
            update: request
        })
    }

    async get(id: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { id } })
    }

    async getByTwitchId(twitchId: string) {
        return prisma.user.findUnique({ where: { twitch_id: twitchId }, include: { auth: true } })
    }

    async count(): Promise<number> {
        return prisma.user.count();
    }

    async findMany(skip: number, take: number): Promise<User[]> {
        return prisma.user.findMany({
            skip,
            take,
            orderBy: { id: 'asc' }
        });
    }

    async update(id: string, request: Partial<User>): Promise<User> {
        return prisma.user.update({
            where: { id },
            data: request
        })
    }

}