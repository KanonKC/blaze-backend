import { z } from "zod";

export const updateUploadedFileSchema = z.object({
    name: z.string().optional()
});
