FROM node:20.16-alpine AS builder

WORKDIR /backend
COPY package*.json .
RUN npm ci
COPY . .
RUN mv .env.prod .env.production

ENV NODE_ENV=production
RUN npm run build

RUN npm prune --omit=dev


FROM node:20.16-alpine
WORKDIR /backend
# COPY --from=builder /backend/node_modules node_modules/
# COPY --from=builder /backend/.env .env
# COPY --from=builder /backend/dist dist/
COPY --from=builder /backend/ .

COPY package.json .
RUN npm install -E -g @medusajs/medusa-cli

EXPOSE 7000
ENV NODE_ENV=production
CMD [ "npx", "medusa", "start" ]