import { Widget } from "generated/prisma/client";
import { UpdateWidget } from "./request";
import { prisma } from "@/libs/prisma";

export default class WidgetRepository {
    constructor() {
    }

    async update(id: string, request: UpdateWidget): Promise<Widget> {
        return prisma.widget.update({
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