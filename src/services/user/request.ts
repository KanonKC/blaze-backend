export interface LoginRequest {
    code: string;
    state: string;
    scope: string[];
}
