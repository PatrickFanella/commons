FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html ./
COPY src ./src
COPY shared ./shared
COPY public ./public
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/data/commons.sqlite
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force \
    && mkdir -p /data /backups && chown node:node /data /backups \
    && chmod 700 /data /backups
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-ssr ./dist-ssr
COPY server ./server
COPY shared ./shared
COPY scripts ./scripts
ARG SOURCE_REVISION=unknown
LABEL org.opencontainers.image.revision=$SOURCE_REVISION
RUN node --input-type=module -e 'import { writeFileSync } from "node:fs"; const revision = process.env.SOURCE_REVISION; if (revision !== "unknown" && !/^[0-9a-f]{40}$/.test(revision)) throw new Error("Invalid source revision"); writeFileSync("dist/build-info.json", JSON.stringify({ schema_version: 1, source_commit: revision }) + "\n");'
USER node
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node", "scripts/healthcheck.mjs"]
CMD ["node", "server/index.js"]
