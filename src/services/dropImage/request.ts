export interface CreateDropImageServiceRequest {
    userId: string;
}

export interface UpdateDropImageServiceRequest {
    twitch_reward_id?: string | null;
    twitch_bot_id?: string | null;
    invalid_message?: string | null;
    not_image_message?: string | null;
    contain_mature_message?: string | null;
    enabled_moderation?: boolean;
    enabled?: boolean;
    overlay_key?: string;
}
