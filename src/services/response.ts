export interface ListResponse<T> {
    data: T[]
    pagination: Pagination
}

export interface Pagination {
    page: number
    limit: number
    total?: number
}