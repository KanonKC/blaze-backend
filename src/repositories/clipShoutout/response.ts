import { ClipShoutout, Widget } from "generated/prisma/client";

export interface ClipShoutoutWidget extends ClipShoutout {
    widget: Widget
}