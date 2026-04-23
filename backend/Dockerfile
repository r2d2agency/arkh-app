FROM node:20-alpine

# ffmpeg + yt-dlp são necessários para capturar o áudio do YouTube e enviar ao Whisper
RUN apk add --no-cache ffmpeg python3 yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3001

CMD ["sh", "-c", "node src/db/init.js && node src/index.js"]
