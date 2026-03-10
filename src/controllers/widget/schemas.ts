import { z } from "zod";

export const updateWidgetSchema = z.object({
    enabled: z.boolean(),
    overlay_key: z.string()
}).partial();

export const updateWidgetEnableSchema = z.object({
    enabled: z.boolean()
});
