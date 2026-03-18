import { FirstWord } from "generated/prisma/client";

export interface ExtendedFirstWord extends FirstWord {
    audio_url?: string;
}

