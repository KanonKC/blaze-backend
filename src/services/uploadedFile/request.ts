export interface CreateUploadedFileRequest {
    name: string;
    type: string;
    owner_id: string;
    file: {
        buffer: Buffer;
        filename: string;
        mimetype: string;
    }
}

export interface UpdateUploadedFileRequest {
    name?: string;
}