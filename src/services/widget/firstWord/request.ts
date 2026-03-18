export interface CreateFirstWordRequest {
    twitch_id: string;
    owner_id: string;
    reply_message?: string | null;
    twitch_bot_id?: string | null;
}

export interface ListCustomerReplyFilters {
    search?: string;
}

export interface CreateCustomReplyRequest {
    twitch_chatter_id: string;
    reply_message?: string | null;
    audio_key?: string | null;
    audio_volume?: number;
}

export interface UpdateCustomReplyRequest {
    twitch_chatter_id?: string;
    reply_message?: string | null;
    audio_key?: string | null;
    audio_volume?: number;
}