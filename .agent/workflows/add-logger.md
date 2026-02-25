---
description: Add structured logging to a file
---

This workflow guides you through adding structured logging to a file in the `blaze-backend` project, following the standards defined in `logging-format.md`.

1. **Import the Logger**
   - Add the following import statement at the top of the file:
     ```typescript
     import TLogger, { Layer } from "@/logging/logger";
     ```

2. **Determine the Layer**
   - Identify the architectural layer of the file (e.g., Controller, Service, Repository).
   - Use the appropriate `Layer` enum value (e.g., `Layer.CONTROLLER`, `Layer.SERVICE`).

3. **Instantiate the Logger**
   - Create a `logger` instance at the class or module level:
     ```typescript
     const logger = new TLogger(Layer.YOUR_LAYER_HERE);
     ```

4. **Set Context in Methods**
   - At the beginning of each method or function where logging is needed, set the context:
     ```typescript
     logger.setContext("domain.feature.action");
     ```
     - Replace `domain.feature.action` with a specific context string (e.g., `user.auth.login`).

5. **Add Log Statements**
   - Replace `console.log` or add new logs using `logger.info`, `logger.warn`, or `logger.error`.
   - **Info:** For successful operations and general flow.
     ```typescript
     logger.info({
         message: "Operation successful",
         data: result
     });
     ```
   - **Warn:** For expected issues or validation errors.
     ```typescript
     logger.warn({
         message: "Validation failed",
         data: input,
         error: "Invalid email format"
     });
     ```
   - **Error:** For exceptions and critical failures.
     ```typescript
     logger.error({
         message: "Operation failed",
         error: err
     });
     ```

6. **Verify Imports and Usage**
   - Ensure `TLogger` and `Layer` are correctly imported.
   - Verify that `setContext` is called before any log statements in a scope.
   - Check that the `LogMeta` object structure is followed.

Make an implementation plan before proceed.