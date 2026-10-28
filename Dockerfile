# Multi-stage build for OmniTerm Web VPS Deployment
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy source and build web distribution
COPY . .
RUN npm run build || true

# Production serving stage with Nginx Alpine
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3200
CMD ["nginx", "-g", "daemon off;"]
