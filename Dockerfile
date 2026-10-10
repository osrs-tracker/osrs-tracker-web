# Stage 1: Build the application
# Both stages pin the same digest; Dependabot bumps them together when the image is rebuilt (.github/dependabot.yml)
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the application from the sitemaps and icons in the context: the CD workflow (or predocker:build) generated them
# just before and commits the same files, so the image serves what's on main. --ignore-scripts skips prebuild, which
# would fetch the Wiki and the API again, so postbuild runs by hand.
RUN npm run build --ignore-scripts && npm run postbuild

# Stage 2: Setup production environment
FROM node:24-alpine@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS production

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
