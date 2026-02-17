import { UploadedFileRepository } from "@/repositories/uploadedFile/uploadedFile.repository"
import { CreateUploadedFileRequest, UpdateUploadedFileRequest } from "./request"
import { prisma } from "@/libs/prisma"
import s3 from "@/libs/awsS3"
import { randomBytes } from "crypto"
import { NotFoundError, ForbiddenError } from "@/errors"
import { UploadedFileResponse } from "./response"
import { UploadedFile } from "generated/prisma/client"

export class UploadedFileService {
    private ufr: UploadedFileRepository
    constructor(
        uploadedFileRepository: UploadedFileRepository
    ) {
        this.ufr = uploadedFileRepository
    }

    async extend(uf: UploadedFile): Promise<UploadedFileResponse> {
        const url = await s3.getSignedURL(uf.key, { expiresIn: 3600 });
        return {
            ...uf,
            url
        }
    }

    async create(userId: string, file: { buffer: Buffer, filename: string, mimetype: string }) {
        const random = randomBytes(16).toString("hex")
        const key = `users/${userId}/${random}`
        await s3.uploadFile(file.buffer, key, file.mimetype)
        await this.ufr.create({
            name: file.filename,
            type: file.mimetype,
            owner_id: userId,
            key: key
        })
    }

    async get(id: string, userId: string): Promise<UploadedFileResponse> {
        const data = await this.ufr.get(id)
        if (!data) {
            throw new NotFoundError("File not found")
        }
        if (data.owner_id !== userId) {
            throw new ForbiddenError("You are not allowed to access this file")
        }
        return this.extend(data)
    }

    async update(id: string, userId: string, request: UpdateUploadedFileRequest) {
        const data = await this.ufr.get(id)
        if (!data) {
            throw new NotFoundError("File not found")
        }
        if (data.owner_id !== userId) {
            throw new ForbiddenError("You are not allowed to update this file")
        }
        return this.ufr.update(id, request)
    }

    async delete(id: string, userId: string) {
        const data = await this.ufr.get(id)
        if (!data) {
            throw new NotFoundError("File not found")
        }
        if (data.owner_id !== userId) {
            throw new ForbiddenError("You are not allowed to delete this file")
        }
        return this.ufr.delete(id)
    }
}