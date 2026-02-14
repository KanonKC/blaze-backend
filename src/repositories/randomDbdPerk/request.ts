export interface CreateRandomDbdPerk {
    twitch_id: string;
    enabled?: boolean;
    owner_id: string;
    widget_type_slug?: string;
}

export interface UpdateRandomDbdPerk {
    classes?: {
        type: RandomDbdPerkClassType;
        enabled?: boolean;
        twitch_reward_id?: string | null;
        maximum_random_size?: number;
    }[];
}

export enum RandomDbdPerkClassType {
    SURVIVOR = "survivor",
    KILLER = "killer"
}