import { Widget } from "generated/prisma/client";
import { UpdateWidget } from "./request";
import { prisma } from "@/libs/prisma";
import { ExtendedWidget } from "./response";

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



}