import { RandomDbdPerkClassType } from "@/repositories/randomDbdPerk/request";
import { z } from "zod";


export const updateRandomDbdPerkSchema = z.object({
    enabled: z.boolean().optional(),
    classes: z.array(z.object({
        type: z.nativeEnum(RandomDbdPerkClassType),
        enabled: z.boolean().optional(),
        twitch_reward_id: z.string().nullable().optional(),
        maximum_random_size: z.number().optional()
    })).optional()
});


export const createRandomDbdPerkSchema = z.object({
    enabled: z.boolean().optional()
});
