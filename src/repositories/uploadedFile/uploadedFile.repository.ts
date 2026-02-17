import { prisma } from "@/libs/prisma";
import { CreateUploadedFileRequest, UpdateUploadedFileRequest } from "./request";

export class UploadedFileRepository {
    constructor() { }

    async create(request: CreateUploadedFileRequest) {
        return prisma.uploadedFile.create({
            data: request
        })
    }

    async get(id: string) {
        return prisma.uploadedFile.findUnique({
            where: {
                id
            }
        })
    }

    async update(id: string, request: UpdateUploadedFileRequest) {
        return prisma.uploadedFile.update({
            where: {
                id
            },
            data: request
        })
    }

    async delete(id: string) {
        return prisma.uploadedFile.delete({
            where: {
                id
            }
        })
    }
}