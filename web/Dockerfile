FROM node:22-alpine AS base
WORKDIR /app
COPY app-single/package*.json ./
RUN npm install
COPY app-single/ .
RUN npm run build
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs
USER nextjs
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
CMD ["npm", "start"]
