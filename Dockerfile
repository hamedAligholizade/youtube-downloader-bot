FROM node:16-alpine

WORKDIR /app

# Install dependencies required for yt-dlp
RUN apk add --no-cache python3 ffmpeg curl

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "start"] 