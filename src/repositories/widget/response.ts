import { Widget, WidgetType } from "generated/prisma/client";

export interface ExtendedWidget extends Widget {
    widget_type: WidgetType | null;
}