# Stage 1: Build the application
FROM node:22-alpine AS build

WORKDIR /app

# Copy scripts package.json and package-lock.json
COPY scripts/package*json ./scripts/

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate sitemap and build the application
RUN npm run build

# Stage 2: Setup production environment
FROM node:22-alpine AS production

WORKDIR /app

# Copy built application from the build stage
COPY --from=build /app/dist ./dist

# Set environment variables
ENV PORT=8080

# Expose the port the app runs on
EXPOSE $PORT

# Command to run the application
CMD ["node", "dist/osrs-tracker-web/server/server.mjs"]

# Health check using the /healthy endpoint available in server.ts
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:8080/healthy || exit 1
