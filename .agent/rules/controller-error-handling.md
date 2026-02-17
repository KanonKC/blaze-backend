
# Controller Error Handling

When implementing controllers in the `blaze-backend` project, you must follow the structured error handling using the `TError` class and its subclasses. This ensures consistency and proper HTTP status codes.

## Import
Always import `TError` and relevant error subclasses from the project's errors module:
```typescript
import { TError } from "@/errors";
import { z } from "zod"; // If using Zod validation
```

## Structure
Wrap your controller logic in a `try-catch` block. Handle `z.ZodError`, `TError`, and generic errors separately.

```typescript
try {
    // Controller logic
} catch (error) {
    this.logger.error({ 
        message: "Error message", 
        data: { ... }, 
        error: error as Error 
    });

    if (error instanceof z.ZodError) {
        return res.status(400).send({ 
            message: "Validation Error", 
            errors: error.issues 
        });
    }

    if (error instanceof TError) {
        return res.status(error.code).send({ 
            message: error.message 
        });
    }

    res.status(500).send({ message: "Internal Server Error" });
}
```

## Error Types
- **NotFoundError (404)**: For missing resources.
- **ForbiddenError (403)**: For access violations.
- **BadRequestError (400)**: For invalid input (outside Zod).
- **UnauthorizedError (401)**: For explicit unauthorized cases (though middleware usually handles this).
- **InternalServerError (500)**: For unexpected failures.

## Logging
Always log the error using `logger.error` before returning the response. Include relevant data and the error object.
