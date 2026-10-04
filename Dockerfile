# Stage 1: Build the application
FROM node:24-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Generate sitemap and build the application
RUN npm run build

# Stage 2: Setup production environment
FROM node:24-alpine AS production

WORKDIR /app

# Copy built application from the build stage
COPY --from=build /app/dist ./dist

# Set environment variables
ENV PORT=8080
ENV METRICS_PORT=9090

# Expose the port the app runs on
EXPOSE $PORT
EXPOSE $METRICS_PORT

# Run as the image's unprivileged user
USER node

# Command to run the application
CMD ["node", "dist/osrs-tracker-web/server/server.mjs"]
