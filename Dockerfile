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

# Install yt-dlp using pip and upgrade to latest version
RUN pip3 install --no-cache-dir --upgrade yt-dlp

# Create empty cookies file
RUN touch /app/cookies.txt

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Ensure cookies file exists and has correct permissions
RUN touch /app/cookies.txt && chmod 644 /app/cookies.txt

# Start the application
CMD ["npm", "start"] 