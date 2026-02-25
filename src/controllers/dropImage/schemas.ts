import { z } from "zod";

export const createDropImageSchema = z.object({});

export const updateDropImageSchema = z.object({
    twitch_reward_id: z.string().nullable().optional(),
    twitch_bot_id: z.string().nullable().optional(),
    invalid_message: z.string().nullable().optional(),
    not_image_message: z.string().nullable().optional(),
    contain_mature_message: z.string().nullable().optional(),
    enabled_moderation: z.boolean().optional(),
    enabled: z.boolean().optional(),
    display_duration: z.number().int().min(1).max(300).optional(),
});
