class TError extends Error {
    code: number
    constructor({ message, code }: { message: string, code: number }) {
        super(message)
        this.code = code
    }
}

class ForbiddenError extends TError {
    constructor({ message = "Forbidden" }: { message?: string }) {
        super({ message, code: 403 })
    }
}

class NotFoundError extends TError {
    constructor({ message = "Not Found" }: { message?: string }) {
        super({ message, code: 404 })
    }
}

class BadRequestError extends TError {
    constructor({ message = "Bad Request" }: { message?: string }) {
        super({ message, code: 400 })
    }
}

class InternalServerError extends TError {
    constructor({ message = "Internal Server Error" }: { message?: string }) {
        super({ message, code: 500 })
    }
}

class UnauthorizedError extends TError {
    constructor({ message = "Unauthorized" }: { message?: string }) {
        super({ message, code: 401 })
    }
}

export { TError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError, UnauthorizedError }