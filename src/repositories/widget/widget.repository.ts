import { Widget } from "generated/prisma/client";
import { UpdateWidget } from "./request";
import { prisma } from "@/libs/prisma";
import { ExtendedWidget } from "./response";
import { Pagination } from "@/services/response";

export default class WidgetRepository {
    constructor() {
    }

    async get(id: string): Promise<ExtendedWidget | null> {
        return prisma.widget.findUnique({
            where: { id },
            include: {
                widget_type: true,
            }
        });
    }

    async getByOverlayKey(overlayKey: string): Promise<ExtendedWidget | null> {
        return prisma.widget.findUnique({
            where: { overlay_key: overlayKey },
            include: {
                widget_type: true,
            }
        });
    }

    async update(id: string, request: UpdateWidget): Promise<void> {
        await prisma.widget.update({
            where: { id },
            data: request,
        });
    }

    async delete(id: string): Promise<void> {
        await prisma.widget.delete({
            where: { id },
        });
    }

    async listByOwnerId(ownerId: string, pagination: Pagination, filters?: { enabled?: boolean }): Promise<[ExtendedWidget[], number]> {
        const res = await prisma.widget.findMany({
            where: { owner_id: ownerId, ...filters },
            include: {
                widget_type: true,
            },
            skip: (pagination.page - 1) * pagination.limit,
            take: pagination.limit,
        });
        const total = await prisma.widget.count({
            where: { owner_id: ownerId, ...filters },
        });
        return [res, total];
    }

    async disableAll(ownerId: string): Promise<void> {
        await prisma.widget.updateMany({
            where: { owner_id: ownerId },
            data: { enabled: false },
        });
    }

}