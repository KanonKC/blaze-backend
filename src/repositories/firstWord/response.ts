import { FirstWord, Widget } from "generated/prisma/client";

export interface FirstWordWidget extends FirstWord {
    widget: Widget
}