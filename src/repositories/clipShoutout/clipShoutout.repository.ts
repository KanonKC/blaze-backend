import { prisma } from "@/libs/prisma";
import { CreateClipShoutout, UpdateClipShoutout } from "./request";
import { WidgetTypeSlug } from "@/services/widget/constant";
import { ClipShoutoutWidget } from "./response";

export default class ClipShoutoutRepository {

    constructor() {
    }

    async create(request: CreateClipShoutout): Promise<ClipShoutoutWidget> {
        return prisma.clipShoutout.create({
            data: {
                ...request,
                widget: {
                    create: {
                        ...request,
                        widget_type_slug: WidgetTypeSlug.CLIP_SHOUTOUT
                    }
                }
            },
            include: {
                widget: true,
            }
        });
    }

    async update(id: string, request: UpdateClipShoutout): Promise<ClipShoutoutWidget> {
        return prisma.clipShoutout.update({
            where: { id },
            data: request,
            include: {
                widget: true,
            }
        });
    }

    async delete(id: string): Promise<void> {
        await prisma.clipShoutout.delete({
            where: { id },
        });
    }

    async getByOwnerId(ownerId: string): Promise<ClipShoutoutWidget | null> {
        const widget = await prisma.widget.findUniqueOrThrow({
            where: {
                owner_id_widget_type_slug: {
                    owner_id: ownerId,
                    widget_type_slug: WidgetTypeSlug.CLIP_SHOUTOUT
                }
            }
        });
        return prisma.clipShoutout.findUnique({
            where: { widget_id: widget.id },
            include: {
                widget: true,
            }
        });
    }

    async getByTwitchId(twitchId: string): Promise<ClipShoutoutWidget | null> {
        const widget = await prisma.widget.findUniqueOrThrow({
            where: {
                twitch_id_widget_type_slug: {
                    twitch_id: twitchId,
                    widget_type_slug: WidgetTypeSlug.CLIP_SHOUTOUT
                }
            }
        });
        return prisma.clipShoutout.findUnique({
            where: { widget_id: widget.id },
            include: {
                widget: true,
            }
        });
    }
}