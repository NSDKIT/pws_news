# Production image: Express serves Vite `dist/` + API. Set GEMINI_API_KEY at runtime.
# news.json is written under the app directory; use a volume or external storage if you need persistence across redeploys.
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["./node_modules/.bin/tsx", "server.ts"]
