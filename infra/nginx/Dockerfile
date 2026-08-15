FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages
RUN pnpm install --frozen-lockfile --fetch-timeout=300000 --fetch-retries=8 --filter '@dentora/web...' --filter '@dentora/admin...' --filter '@dentora/portal...'
RUN pnpm --filter @dentora/web --filter @dentora/admin --filter @dentora/portal build

FROM nginx:1.27-alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html/web
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html/admin
COPY --from=builder /app/apps/portal/dist /usr/share/nginx/html/portal
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf
