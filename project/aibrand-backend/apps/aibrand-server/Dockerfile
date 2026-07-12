FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Copy compiled JS output (nx build must be run first)
COPY dist/apps/aibrand-server/package.json ./package.json
COPY dist/apps/aibrand-server/src/ ./dist/src/
COPY pnpm-workspace.yaml ./

# Copy compiled libs
COPY dist/libs/ ./dist/libs/
COPY dist/libs/ ./libs/

RUN for lib in /app/libs/*/; do \
      name=$(basename "$lib"); \
      if [ -d "/app/dist-libs/$name/src" ]; then \
        rm -rf "$lib" && cp -r "/app/dist-libs/$name" "$lib"; \
      fi; \
    done; \
    rm -rf /app/dist-libs

# Pin @nestjs/swagger to host-compatible version
RUN npm pkg set pnpm.overrides.@nestjs/swagger=11.2.5 && \
    pnpm install --prod --no-frozen-lockfile

ENV NODE_ENV=production
CMD ["node", "dist/src/main.js", "-c", "config.js"]
