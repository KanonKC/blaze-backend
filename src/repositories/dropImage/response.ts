import { DropImage, Widget } from "generated/prisma/client";

export interface DropImageWidget extends DropImage {
    widget: Widget;
}
