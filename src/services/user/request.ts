export interface LoginRequest {
    code: string;
    state: string;
    scope: string[];
}

export interface GetTierOptions {
    forceTwitch?: boolean;
}