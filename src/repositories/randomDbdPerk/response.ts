import { RandomDbdPerk, Widget, RandomDbdPerkClass } from "generated/prisma/client";

export interface RandomDbdPerkWidget extends RandomDbdPerk {
    widget: Widget;
    classes: RandomDbdPerkClass[];
}
