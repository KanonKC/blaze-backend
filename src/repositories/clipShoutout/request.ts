export interface CreateClipShoutout {
    twitch_id: string;
    enabled?: boolean;
    twitch_bot_id: string;
    reply_message?: string | null;
    enabled_clip?: boolean;
    enabled_highlight_only?: boolean;
    overlay_key: string;
    owner_id: string;
    clip_volume?: number;
}

export interface UpdateClipShoutout {
    enabled?: boolean;
    twitch_bot_id?: string | null;
    reply_message?: string | null;
    enabled_clip?: boolean;
    enabled_highlight_only?: boolean;
    overlay_key?: string;
    clip_volume?: number;
}