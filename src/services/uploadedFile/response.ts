import { UploadedFile } from "generated/prisma/client";

export interface UploadedFileResponse extends UploadedFile {
    url: string
}