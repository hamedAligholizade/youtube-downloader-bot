FROM node:16-alpine

WORKDIR /app

# Install dependencies required for yt-dlp and video processing
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    ca-certificates \
    openssl \
    aria2

# Install yt-dlp using pip (more reliable than direct download)
RUN pip3 install --no-cache-dir yt-dlp

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

COPY . .

# Update yt-dlp on container start
CMD yt-dlp --update-to nightly && npm start 