# Stage 1: Build the application
# Both stages pin the same digest; Dependabot bumps them together when the image is rebuilt (.github/dependabot.yml)
FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS build

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
FROM node:26-alpine@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94 AS production

WORKDIR /app

# Copy built application from the build stage
COPY --from=build /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV METRICS_PORT=9090

# Expose the port the app runs on
EXPOSE $PORT
EXPOSE $METRICS_PORT

# Run as the image's unprivileged user
USER node

# Command to run the application
CMD ["node", "dist/osrs-tracker-web/server/server.mjs"]
