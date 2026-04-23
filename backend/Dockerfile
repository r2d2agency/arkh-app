FROM node:20-alpine

# ffmpeg é necessário para extrair/converter o áudio dos vídeos do YouTube antes de enviar ao Whisper
RUN apk add --no-cache ffmpeg python3

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3001

CMD ["sh", "-c", "node src/db/init.js && node src/index.js"]
