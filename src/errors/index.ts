class TError extends Error {
    code: number
    constructor({ message, code }: { message: string, code: number }) {
        super(message)
        this.code = code
    }

    toJSON() {
        return {
            message: this.message,
            code: this.code
        }
    }
}

class ForbiddenError extends TError {
    constructor(message?: string) {
        super({ message: message ?? "Forbidden", code: 403 })
    }
}

class NotFoundError extends TError {
    constructor(message?: string) {
        super({ message: message ?? "Not Found", code: 404 })
    }
}

class BadRequestError extends TError {
    constructor(message?: string) {
        super({ message: message ?? "Bad Request", code: 400 })
    }
}

class InternalServerError extends TError {
    constructor(message?: string) {
        super({ message: message ?? "Internal Server Error", code: 500 })
    }
}

class UnauthorizedError extends TError {
    constructor(message?: string) {
        super({ message: message ?? "Unauthorized", code: 401 })
    }
}

export { TError, ForbiddenError, NotFoundError, BadRequestError, InternalServerError, UnauthorizedError }