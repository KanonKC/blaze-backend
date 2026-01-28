import { prisma } from "@/libs/prisma";
import { FirstWord, FirstWordChatter } from "generated/prisma/client";
import { AddChatterRequest, CreateFirstWordRequest, UpdateFirstWordRequest } from "./request";

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
        console.log("Update request:", request);
        return prisma.firstWord.update({
            where: { id },
            data: request
        });
    }

    async delete(id: string): Promise<FirstWord> {
        return prisma.firstWord.delete({ where: { id } });
    }

    async addChatter(request: AddChatterRequest): Promise<void> {
        await prisma.firstWordChatter.create({
            data: request
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

    async getChatters(id: string): Promise<FirstWordChatter[]> {
        return prisma.firstWordChatter.findMany({
            where: {
                first_word_id: id
            }
        });
    }

    async getChattersByChannelId(channelId: string): Promise<FirstWordChatter[]> {
        return prisma.firstWordChatter.findMany({
            where: {
                twitch_channel_id: channelId
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
