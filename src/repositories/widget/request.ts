export interface WidgetCreate {
    twitch_id: string;
    overlay_key?: string | null;
    owner_id: string;
}

export interface WidgetUpdate {
    overlay_key?: string | null;
}