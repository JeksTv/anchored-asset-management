FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build && mkdir -p /app/data && chown -R node:node /app
USER node
ENV NODE_ENV=production DATA_DIR=/app/data
EXPOSE 3000
CMD ["node", "node_modules/vinext/dist/cli.js", "start", "--hostname", "0.0.0.0", "--port", "3000"]
