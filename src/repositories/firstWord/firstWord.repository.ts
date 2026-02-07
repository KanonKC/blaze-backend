import { prisma } from "@/libs/prisma";
import WidgetRepository, { WidgetTypeSlug } from "../widget/widget.repository";
import { AddChatterRequest, FirstWordCreate, FirstWordUpdate } from "./request";

export default class FirstWordRepository extends WidgetRepository {
    constructor() {
        super(WidgetTypeSlug.FIRST_WORD);
    }

    async createWidget(request: FirstWordCreate) {
        const type = await this.getWidgetType();
        return prisma.widget.create({
            data: {
                twitch_id: request.twitch_id,
                owner_id: request.owner_id,
                overlay_key: request.overlay_key,
                widget_type_id: type.id,
                first_word: {
                    create: {
                        reply_message: request.reply_message,
                        twitch_bot_id: request.twitch_bot_id
                    }
                }
            },
            include: {
                first_word: true
            }
        });
    }

    async updateFirstWord(id: string, request: FirstWordUpdate) {
        console.log("Update request:", request);
        return prisma.widget.update({
            where: { id },
            data: {
                first_word: {
                    update: request
                }
            }
        });
    }

    async addChatter(request: AddChatterRequest) {
        await prisma.firstWordChatter.create({
            data: request
        });
    }

    async getChatter(id: string, chatterId: string) {
        return prisma.firstWordChatter.findUnique({
            where: {
                twitch_chatter_id_first_word_id: {
                    first_word_id: id,
                    twitch_chatter_id: chatterId
                }
            }
        });
    }

    async getChatters(id: string) {
        return prisma.firstWordChatter.findMany({
            where: {
                first_word_id: id
            }
        });
    }

    async getChattersByChannelId(channelId: string) {
        return prisma.firstWordChatter.findMany({
            where: {
                twitch_channel_id: channelId
            }
        });
    }

    async clearChatters(id: string) {
        await prisma.firstWordChatter.deleteMany({
            where: {
                first_word_id: id
            }
        });
    }
}
