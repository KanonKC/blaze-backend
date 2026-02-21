
# Service Layer Guidelines

Arguments and return types in the service layer should be strictly typed. Business logic, including validation and authorization, belongs here.

## Error Handling
Do not return `null` or `false` to indicate errors. Explicitly throw typed errors from `@/errors`.

### Usage
```typescript
import { NotFoundError, ForbiddenError } from "@/errors";

// ... inside a method
const record = await this.repo.findById(id);
if (!record) {
throw new NotFoundError("Record not found");
}
```

## Authorization
Services must ensure the user owns or has access to the resource they are manipulating. Verification usually happens after data retrieval.

### Implementation
Create a private `authorize` helper method in your service class:

```typescript
private authorize(userId: string, resource: ResourceType): void {
if (resource.ownerId !== userId) {
throw new ForbiddenError("You do not have permission to access this resource");
}
}
```

### Application
Call `authorize` immediately after reclaiming a resource in `get`, `update`, and `delete` methods.

```typescript
async update(userId: string, id: string, data: UpdateDto) {
const resource = await this.repo.findById(id);
if (!resource) throw new NotFoundError();

this.authorize(userId, resource); // Enforce ownership

return this.repo.update(id, data);
}
```

## Exceptions
Authorization checks may be skipped when:
1. **Creation**: The resource doesn't exist yet (ownership is being established).
2. **Public Data**: The data is intended to be publicly accessible.
3. **System Events**: Actions triggered by webhooks or internal events where no user session exists (e.g., Twitch EventSub).
