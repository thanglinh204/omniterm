# Multi-stage build for OmniTerm Web VPS Deployment
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy source and build web distribution
COPY . .
RUN npm run build || true

# Production serving stage with Node 22 (has native node:sqlite) + Nginx
FROM node:22-alpine
WORKDIR /app

# Install nginx & supervisor
RUN apk add --no-cache nginx supervisor

# Copy control-plane server
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev --no-audit --no-fund

COPY server/ ./server/
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Supervisor configuration to run both Nginx and Node Gateway
RUN echo '[supervisord]' > /etc/supervisord.conf && \
    echo 'user=root' >> /etc/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisord.conf && \
    echo '[program:nginx]' >> /etc/supervisord.conf && \
    echo 'command=nginx -g "daemon off;"' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf && \
    echo '[program:gateway]' >> /etc/supervisord.conf && \
    echo 'directory=/app/server' >> /etc/supervisord.conf && \
    echo 'command=node --experimental-sqlite src/main.mjs' >> /etc/supervisord.conf && \
    echo 'environment=PORT="8080",HOST="127.0.0.1"' >> /etc/supervisord.conf && \
    echo 'autostart=true' >> /etc/supervisord.conf && \
    echo 'autorestart=true' >> /etc/supervisord.conf

EXPOSE 3200
CMD ["supervisord", "-c", "/etc/supervisord.conf"]

