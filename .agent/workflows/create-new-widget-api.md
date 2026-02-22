---
description: Create complete API flow for a new widget
---

This workflow guides you through creating a complete API flow for a new widget in the `blaze-backend` project. It covers all layers from the database to the API routes, following the project's architecture (Controller -> Service -> Repository).

## Prerequisites
- Determine the name of your widget (e.g., `MyNewWidget`).
- Identify the necessary data fields and relationships.

## 1. Database Layer (Prisma)

1.  **Open `prisma/schema.prisma`**:
    - Add a new model for your widget.
    - If it's a widget configuration, ensure it relates to the `Widget` model if applicable (like `FirstWord` does).

    ```prisma
    model MyNewWidget {
      id        String   @id @default(cuid())
      // Add your fields here
      setting_a String
      
      // Relations
      widget    Widget   @relation(fields: [widget_id], references: [id], onDelete: Cascade)
      widget_id String   @unique

      created_at DateTime @default(now())
      updated_at DateTime @updatedAt
    }
    ```

2.  **Generate Prisma Client**:
    - Run the command to update the client:
      ```bash
      npx prisma generate
      ```
    - (Optional) Create a migration if you are ready to apply changes to the DB:
      ```bash
      npx prisma migrate dev --name add_my_new_widget
      ```

## 2. Repository Layer

Create the repository to handle database interactions.

1.  **Create Directory**: `src/repositories/[widgetName]`
2.  **Create Files**:
    - `request.ts`: Define interfaces for creating/updating data.
    - `response.ts`: Define interfaces for the data returned to the service.
    - `[widgetName].repository.ts`: The class implementing Prisma calls.

    **Example (`[widgetName].repository.ts`):**
    ```typescript
    import { prisma } from "@/libs/prisma";
    import { MyNewWidget } from "generated/prisma/client";
    import { CreateMyNewWidget, UpdateMyNewWidget } from "./request";
    
    export default class MyNewWidgetRepository {
        async create(data: CreateMyNewWidget): Promise<MyNewWidget> {
            return prisma.myNewWidget.create({ data });
        }
    
        async get(id: string): Promise<MyNewWidget | null> {
            return prisma.myNewWidget.findUnique({ where: { id } });
        }
    
        async update(id: string, data: UpdateMyNewWidget): Promise<MyNewWidget> {
            return prisma.myNewWidget.update({ where: { id }, data });
        }
    
        async delete(id: string): Promise<void> {
            await prisma.myNewWidget.delete({ where: { id } });
        }
    }
    ```

## 3. Service Layer

Create the service to handle business logic.

1.  **Create Directory**: `src/services/[widgetName]`
2.  **Create Files**:
    - `request.ts`: DTOs for service methods.
    - `[widgetName].service.ts`: The class containing business logic.

    **Example (`[widgetName].service.ts`):**
    ```typescript
    import Configurations from "@/config/index";
    import MyNewWidgetRepository from "@/repositories/[widgetName]/[widgetName].repository";
    import TLogger, { Layer } from "@/logging/logger";
    
    export default class MyNewWidgetService {
        private readonly logger = new TLogger(Layer.SERVICE);
    
        constructor(
            private readonly config: Configurations,
            private readonly repository: MyNewWidgetRepository
        ) {}
    
        async create(data: any) {
            this.logger.setContext("service.myNewWidget.create");
            // Add business logic here
            return this.repository.create(data);
        }
        
        // Add other methods (get, update, delete)
    }
    ```

## 4. Controller Layer

Create the controller to handle HTTP requests.

1.  **Create Directory**: `src/controllers/[widgetName]`
2.  **Create Files**:
    - `schemas.ts`: Zod schemas for request validation.
    - `[widgetName].controller.ts`: The class handling Fastify requests.

    **Example (`[widgetName].controller.ts`):**
    ```typescript
    import { FastifyReply, FastifyRequest } from "fastify";
    import { z } from "zod";
    import MyNewWidgetService from "@/services/[widgetName]/[widgetName].service";
    import TLogger, { Layer } from "@/logging/logger";
    import { createSchema } from "./schemas";
    
    export default class MyNewWidgetController {
        private readonly logger = new TLogger(Layer.CONTROLLER);
    
        constructor(private readonly service: MyNewWidgetService) {}
    
        async create(req: FastifyRequest, res: FastifyReply) {
            this.logger.setContext("controller.myNewWidget.create");
            try {
                const body = createSchema.parse(req.body);
                const result = await this.service.create(body);
                res.status(201).send(result);
            } catch (error) {
                this.logger.error({ message: "Failed to create", error });
                res.status(500).send({ message: "Internal Server Error" });
            }
        }
        
        // Add get, update, delete methods
    }
    ```

## 5. Route Registration

Connect everything in `src/routes.ts`.

1.  **Import Classes**:
    - Import your new Repository, Service, and Controller at the top of `src/routes.ts`.
2.  **Instantiate Layers**:
    - **Repository Layer**: `const myNewWidgetRepository = new MyNewWidgetRepository();`
    - **Service Layer**: `const myNewWidgetService = new MyNewWidgetService(config, myNewWidgetRepository);`
    - **Controller Layer**: `const myNewWidgetController = new MyNewWidgetController(myNewWidgetService);`
3.  **Define Routes**:
    - Add the API endpoints near the bottom of the file.

    ```typescript
    server.post("/api/v1/my-new-widget", myNewWidgetController.create.bind(myNewWidgetController));
    server.get("/api/v1/my-new-widget", myNewWidgetController.get.bind(myNewWidgetController));
    server.put("/api/v1/my-new-widget", myNewWidgetController.update.bind(myNewWidgetController));
    server.delete("/api/v1/my-new-widget", myNewWidgetController.delete.bind(myNewWidgetController));
    ```

## 6. (Optional) Event Handling

If your widget reacts to Twitch events (or other webhooks):

1.  **Create Event Handler**: `src/events/twitch/[eventName]/[eventName].event.ts`
2.  **Register in Routes**:
    - Instantiate the event class in `src/routes.ts`.
    - Add the webhook route: `server.post("/webhook/v1/...", eventInstance.handle.bind(eventInstance))`

Make an implementation plan before proceed.