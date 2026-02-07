import { prisma } from "@/libs/prisma";
import { WidgetCreate, WidgetUpdate } from "./request";

export enum WidgetTypeSlug {
    FIRST_WORD = "first-word",
    CLIP_SHOUTOUT = "clip-shoutout"
}

export default class WidgetRepository {
    private readonly widgetTypeSlug: WidgetTypeSlug;
    constructor(widgetTypeSlug: WidgetTypeSlug) {
        this.widgetTypeSlug = widgetTypeSlug;
    }

    async getWidgetType() {
        return prisma.widgetType.findUniqueOrThrow({ where: { slug: this.widgetTypeSlug } });
    }

    async getByOwnerId(owner_id: string) {
        const type = await this.getWidgetType();
        return prisma.widget.findUnique({
            where: { owner_id_widget_type_id: { owner_id, widget_type_id: type.id } }, include: {
                first_word: true,
                clip_shoutout: true
            }
        });
    }

    async create(request: WidgetCreate) {
        return prisma.widget.create({
            data: request
        });
    }

    async update(id: string, request: WidgetUpdate) {
        return prisma.widget.update({
            where: { id },
            data: request
        });
    }

    async delete(id: string) {
        return prisma.widget.delete({
            where: { id }
        });
    }

    async get(id: string) {
        return prisma.widget.findUnique({
            where: { id }, include: {
                first_word: true,
                clip_shoutout: true
            }
        });
    }
}