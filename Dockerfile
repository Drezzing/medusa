FROM node:20.16-alpine AS builder

WORKDIR /backend
COPY package*.json .
RUN npm ci
COPY . .

ENV NODE_ENV=production
RUN npm run build

RUN npm prune --omit=dev


FROM node:20.16-alpine
WORKDIR /backend
COPY --from=builder /backend/ .

EXPOSE 7000
ENV NODE_ENV=production
CMD [ "npx", "medusa", "start" ]