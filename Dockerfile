FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY index.js ./
COPY config ./config
COPY Tanu ./Tanu
COPY db ./db
COPY lib ./lib
COPY assets ./assets

RUN mkdir -p /app/Tanu-htx-session /app/tmp && chown -R node:node /app
USER node

CMD ["node", "index.js"]
