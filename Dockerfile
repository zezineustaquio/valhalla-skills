# Build stage
FROM --platform=linux/arm64 node:24.14-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build args for Vite
ARG VITE_API_URL
ARG VITE_CLIENT_URL

# Build the application
RUN npm run build

# Production stage
FROM --platform=linux/arm64 node:24.14-alpine

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application and server files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public
COPY --from=builder /app/skills.csv ./skills.csv

# Create uploads directory
RUN mkdir -p server/uploads

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "server/api.js"]
