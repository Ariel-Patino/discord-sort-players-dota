FROM node:24-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN chmod +x docker/start.sh

CMD ["./docker/start.sh"]
