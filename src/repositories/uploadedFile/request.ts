export interface CreateUploadedFileRequest {
    key: string;
    name: string;
    type: string;
    owner_id: string;
}

export interface UpdateUploadedFileRequest {
    name?: string;
}
