export interface LoginQuery {
    code: string;
    state: string;
    scope: string;
}

export interface GetTierQuery {
    force?: string;
}
