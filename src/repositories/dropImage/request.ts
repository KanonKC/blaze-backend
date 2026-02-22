export interface CreateDropImage {
    twitch_reward_id?: string | null;
    twitch_bot_id?: string | null;
    invalid_message?: string | null;
    not_image_message?: string | null;
    contain_mature_message?: string | null;
    enabled_moderation?: boolean;
    enabled?: boolean;
    widget_id?: string;
    display_duration?: number;
    twitch_id: string;
    overlay_key: string;
    owner_id: string;
}

export interface UpdateDropImage {
    twitch_reward_id?: string | null;
    twitch_bot_id?: string | null;
    invalid_message?: string | null;
    not_image_message?: string | null;
    contain_mature_message?: string | null;
    enabled_moderation?: boolean;
    enabled?: boolean;
    overlay_key?: string;
    display_duration?: number;
}
