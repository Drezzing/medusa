FROM node:22.14-alpine AS builder

WORKDIR /backend
COPY package*.json .
COPY patches/* patches/
RUN npm ci
RUN npm run patch
COPY . .

ENV NODE_ENV=production
RUN npm run build

RUN npm prune --omit=dev


FROM node:22.14-alpine
WORKDIR /backend
COPY --from=builder /backend/ .

EXPOSE 7000
ENV NODE_ENV=production
CMD [ "npx", "medusa", "start" ]
