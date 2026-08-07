FROM node:22-alpine AS deps
WORKDIR /app
COPY app-single/package*.json ./
RUN npm ci --only=production

FROM node:22-alpine AS builder
WORKDIR /app
# Build-time API base so the image isn't hardcoded to one backend.
# Passed from the environment via docker-compose.yml (build.args).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY app-single/package*.json ./
RUN npm ci
COPY app-single/ .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./
USER nextjs
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
CMD ["npm", "start"]
