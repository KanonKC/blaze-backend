# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client and Build
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy pre-generated Prisma client and runtime from builder
# (prisma is a devDependency, so we copy the generated client instead of regenerating)
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy built assets and config
COPY --from=builder /app/build ./build
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 8080

# Run the application
CMD ["node", "build/src/index.js"]
