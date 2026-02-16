import { z } from "zod";

export const updateWidgetSchema = z.object({
    enabled: z.boolean(),
    overlay_key: z.string()
}).partial();
