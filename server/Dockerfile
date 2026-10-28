# Pilot only. Release engineering must pin a reviewed image digest before production.
FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 DATABASE_PATH=/data/control-plane.sqlite
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node src ./src
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8080
CMD ["node", "src/main.mjs"]
