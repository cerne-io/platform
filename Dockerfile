# Stage 1: Build SPA & Hono server bundle
FROM node:22-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Minimal Node runtime
FROM node:22-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production \
  PORT=3000 \
  DATA_DIR=/data/pgdata \
  NODE_OPTIONS="--max-old-space-size=256"

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server
COPY --from=builder /app/LICENSE /app/NOTICE ./

RUN mkdir -p /data && chown -R node:node /app /data
VOLUME ["/data"]

USER node
EXPOSE 3000

CMD ["node", "dist-server/index.js"]