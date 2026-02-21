import { z } from "zod";

export const listUploadedFileSchema = z.object({
    search: z.string().optional(),
    type: z.enum(["audio", "image", "video", "other"]).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().default(10)
});

export const updateUploadedFileSchema = z.object({
    name: z.string().optional()
});
