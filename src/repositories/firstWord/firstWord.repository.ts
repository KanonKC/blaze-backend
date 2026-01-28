import { prisma } from "@/libs/prisma";
import { FirstWord, FirstWordChatter } from "generated/prisma/client";
import { CreateFirstWordRequest, UpdateFirstWordRequest } from "./request";

export default class FirstWordRepository {
    constructor() { }

    async create(request: CreateFirstWordRequest): Promise<FirstWord> {
        return prisma.firstWord.create({
            data: request
        });
    }

    async get(id: string): Promise<FirstWord | null> {
        return prisma.firstWord.findUnique({ where: { id } });
    }

    async getByOwnerId(owner_id: string): Promise<FirstWord | null> {
        return prisma.firstWord.findUnique({ where: { owner_id } });
    }

    async update(id: string, request: UpdateFirstWordRequest): Promise<FirstWord> {
        return prisma.firstWord.update({
            where: { id },
            data: request
        });
    }

    async delete(id: string): Promise<FirstWord> {
        return prisma.firstWord.delete({ where: { id } });
    }

    async addChatter(id: string, chatterId: string): Promise<void> {
        await prisma.firstWordChatter.create({
            data: {
                first_word_id: id,
                twitch_chatter_id: chatterId
            }
        });
    }

    async getChatter(id: string, chatterId: string): Promise<FirstWordChatter | null> {
        return prisma.firstWordChatter.findUnique({
            where: {
                twitch_chatter_id_first_word_id: {
                    first_word_id: id,
                    twitch_chatter_id: chatterId
                }
            }
        });
    }

    async clearChatters(id: string): Promise<void> {
        await prisma.firstWordChatter.deleteMany({
            where: {
                first_word_id: id
            }
        });
    }
}
