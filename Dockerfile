# Stage 1: Build React Frontend
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first for cache layer
COPY package*.json ./
RUN npm ci

# Copy all source files and build
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:22-alpine AS runner

WORKDIR /app

# Create a directory for the database volume mapping and chown to node user
RUN mkdir -p /app/data && chown -R node:node /app/data

COPY package*.json ./
# Install ALL dependencies including tsx so server.ts can run natively
RUN npm ci

# Copy only what's necessary (dist folder + backend file)
COPY --from=builder /app/dist ./dist
COPY server.ts ./

# Explicitly ensure ownership of the production app folder is the non-root 'node' user
RUN chown -R node:node /app

# Switch to the non-root user built into the node alpine image
USER node

# Expose port and start
EXPOSE 3001
CMD ["npx", "tsx", "server.ts"]
