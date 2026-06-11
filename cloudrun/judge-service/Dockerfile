FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY quality-loop.mjs server.mjs ./

USER node

ENV NODE_ENV=production

CMD ["node", "server.mjs"]
