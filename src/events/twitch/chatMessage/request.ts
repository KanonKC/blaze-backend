export interface TwitchChannelChatMessageEventRequest {
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    chatter_user_id: string;
    chatter_user_login: string;
    chatter_user_name: string;
    message_id: string;
    message: {
        text: string;
        fragments: {
            type: string;
            text: string;
            cheermote: unknown | null;
            emote: unknown | null;
            mention: unknown | null;
        }[];
    };
    color: string;
    badges: {
        set_id: string;
        id: string;
        info: string;
    }[];
    message_type: string;
    cheer: number | null;
    reply: unknown | null;
    channel_points_custom_reward_id: string | null;
    source_broadcaster_user_id: string | null;
    source_broadcaster_user_login: string | null;
    source_broadcaster_user_name: string | null;
    source_message_id: string | null;
    source_badges: unknown | null;
}