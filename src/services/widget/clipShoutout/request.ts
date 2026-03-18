export interface ClipShoutoutCreateRequest {
    twitch_id: string;
    owner_id: string;
    reply_message?: string | null;
    twitch_bot_id?: string;
    enabled_clip?: boolean;
    enabled_highlight_only?: boolean;
    clip_volume?: number;
}

export interface ClipShoutoutUpdateRequest {
    enabled?: boolean;
    twitch_bot_id?: string | null;
    reply_message?: string | null;
    enabled_clip?: boolean;
    enabled_highlight_only?: boolean;
    overlay_key?: string;
    clip_volume?: number;
}