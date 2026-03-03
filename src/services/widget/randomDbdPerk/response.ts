import { RandomDbdPerkWidget } from "@/repositories/randomDbdPerk/response";

export interface DbdPerkPagination {
    page: number;
    row: number;
    perk: number;
}

export interface ExtendedRandomDbdPerk extends RandomDbdPerkWidget {
    totalKillerPerks: number;
    totalSurvivorPerks: number;
}