FROM node:22.14-alpine AS builder
WORKDIR /backend

COPY package.json .
COPY bun.lock .
COPY patches/* patches/

RUN npm i -g bun
RUN bun install --frozen-lockfile

COPY . .
ENV NODE_ENV=production
RUN npm run build

# bun does not have a prune command
# since bun has global cache, cost is very low
RUN rm -rf node_modules &&  bun install --frozen-lockfile --production


FROM node:22.14-alpine
WORKDIR /backend
COPY --from=builder /backend/ .

EXPOSE 7000
ENV NODE_ENV=production
CMD [ "npx", "medusa", "start" ]
