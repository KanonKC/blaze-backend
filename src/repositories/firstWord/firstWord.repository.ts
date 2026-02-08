import { prisma } from "@/libs/prisma";
import { FirstWord, FirstWordChatter } from "generated/prisma/client";
import { AddChatter, CreateFirstWord, UpdateFirstWord } from "./request";
import { WidgetTypeSlug } from "@/services/widget/constant";
import { FirstWordWidget } from "./response";

export default class FirstWordRepository {
    constructor() { }

    async create(request: CreateFirstWord): Promise<FirstWordWidget> {
        return prisma.firstWord.create({
            data: {
                ...request,
                widget: {
                    create: {
                        ...request,
                        widget_type_slug: WidgetTypeSlug.FIRST_WORD
                    }
                }
            },
            include: { widget: true }
        });
    }

    async get(id: string): Promise<FirstWordWidget | null> {
        return prisma.firstWord.findUnique({ where: { id }, include: { widget: true } });
    }

    async getByOwnerId(ownerId: string): Promise<FirstWordWidget | null> {
        const widget = await prisma.widget.findUniqueOrThrow({
            where: {
                owner_id_widget_type_slug: {
                    owner_id: ownerId,
                    widget_type_slug: WidgetTypeSlug.FIRST_WORD
                }
            }
        });
        return prisma.firstWord.findUnique({ where: { widget_id: widget.id }, include: { widget: true } });
    }

    async update(id: string, request: UpdateFirstWord): Promise<FirstWordWidget> {
        console.log("Update request:", request);
        return prisma.firstWord.update({
            where: { id },
            data: request,
            include: { widget: true }
        });
    }

    async delete(id: string): Promise<void> {
        await prisma.firstWord.delete({ where: { id } });
    }

    async addChatter(request: AddChatter): Promise<FirstWordChatter> {
        return prisma.firstWordChatter.create({
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
