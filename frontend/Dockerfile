# Multi-Stage Production Dockerfile for CropLens AI Frontend
FROM node:20-alpine AS build

WORKDIR /app

# Install npm dependencies
COPY package*.json ./
RUN npm ci

# Copy frontend source and build production bundle
COPY . .
RUN npm run build

# Nginx Production Stage
FROM nginx:alpine

# Copy built static SPA assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration with SPA routing and reverse proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

