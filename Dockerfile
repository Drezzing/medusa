FROM node:22.23.4-alpine3.24 AS builder
WORKDIR /backend

COPY package.json .
COPY bun.lock .
COPY patches/* patches/

RUN npm i -g bun@1.2.13
RUN bun install --frozen-lockfile

COPY . .
ENV NODE_ENV=production
RUN npm run build

# bun does not have a prune command
# since bun has global cache, cost is very low
RUN rm -rf node_modules && bun install --frozen-lockfile --production
RUN wget -qO- https://gobinaries.com/tj/node-prune | /bin/sh && node-prune

FROM node:22.23.4-alpine3.24
WORKDIR /backend
COPY --from=builder /backend/ .

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
    CMD wget --spider -nv -t1 http://localhost:9000/health || exit 1

ENV NODE_ENV=production
CMD [ "npx", "medusa", "start" ]
