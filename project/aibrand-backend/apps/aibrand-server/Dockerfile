FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY apps/aibrand-server/package.json ./package.json
COPY apps/aibrand-server/src/ ./dist/src/
COPY pnpm-workspace.yaml ./

COPY libs/ ./libs-src/
COPY libs/ ./dist-libs/

RUN for lib in /app/libs-src/*/; do \
      name=$(basename "$lib"); \
      if [ -d "/app/dist-libs/$name/src" ]; then \
        rm -rf "$lib/src" && cp -r "/app/dist-libs/$name/src" "$lib/src"; \
      fi; \
    done && mv /app/libs-src /app/libs && rm -rf /app/dist-libs

# Pin @nestjs/swagger to host-compatible version (11.4.x blocks internal exports)
RUN npm pkg set pnpm.overrides.@nestjs/swagger=11.2.5 && \
    pnpm install --prod --no-frozen-lockfile

ENV NODE_ENV=production
CMD ["node", "dist/src/main.js", "-c", "config.js"]
