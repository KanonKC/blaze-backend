/**
 * @link https://dev.twitch.tv/docs/eventsub/eventsub-reference/#channel-points-custom-reward-redemption-add-event
 */
export interface TwitchChannelRedemptionAddEventRequest {
    id: string;
    broadcaster_user_id: string;
    broadcaster_user_login: string;
    broadcaster_user_name: string;
    user_id: string;
    user_login: string;
    user_name: string;
    user_input: string;
    status: ChannelRedemptionStatus;
    reward: ChannelRedemptionReward;
    redeemed_at: string;
}

export type ChannelRedemptionStatus = "unknown" | "unfulfilled" | "fulfilled" | "canceled";

export interface ChannelRedemptionReward {
    id: string;
    title: string;
    cost: number;
    prompt: string;
}
