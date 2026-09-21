FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

ARG CACHEBUST=1
ARG NEXT_PUBLIC_API_URL=https://api.florayapaycicek.com
ARG NEXT_PUBLIC_UPLOAD_URL=https://api.florayapaycicek.com
ARG NEXT_PUBLIC_ENABLE_KNOWLEDGE_BASE=false
ARG NEXT_PUBLIC_ENABLE_SALES_CENTER=true
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_UPLOAD_URL=$NEXT_PUBLIC_UPLOAD_URL
ENV NEXT_PUBLIC_ENABLE_KNOWLEDGE_BASE=$NEXT_PUBLIC_ENABLE_KNOWLEDGE_BASE
ENV NEXT_PUBLIC_ENABLE_SALES_CENTER=$NEXT_PUBLIC_ENABLE_SALES_CENTER
COPY . .
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
