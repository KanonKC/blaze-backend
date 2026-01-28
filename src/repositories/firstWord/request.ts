export interface CreateFirstWordRequest {
    twitch_id: string;
    owner_id: string;
    reply_message?: string;
}

export interface UpdateFirstWordRequest {
    reply_message?: string;
}
