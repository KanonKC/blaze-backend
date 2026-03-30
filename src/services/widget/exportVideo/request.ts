export interface CreateExportVideo {
    twitch_id: string;
    owner_id: string;
    overlay_key: string;
    enabled?: boolean;
    privacy_status?: string;
    tags?: string[];
    description?: string | null;
}

export interface UpdateExportVideo {
    enabled?: boolean;
    overlay_key?: string;
    privacy_status?: string;
    tags?: string[];
    description?: string | null;
}

export interface CreateExportVideoHistory {
    batch_id?: string | null;
    video_id: string;
    status: string;
    message?: string | null;
}
