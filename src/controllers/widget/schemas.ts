import { z } from "zod";

export const updateWidgetEnabledSchema = z.object({
    enabled: z.boolean()
});

export const updateWidgetOverlaySchema = z.object({
    overlay: z.string()
});
