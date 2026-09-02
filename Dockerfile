FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json index.js config.js README.md .env.example ./
COPY Tanu ./Tanu
COPY db ./db
COPY lib ./lib
COPY plugins ./plugins
RUN npm run build
RUN chown -R node:node /app
USER node
ENV NODE_ENV=production
CMD ["node", "index.js"]
