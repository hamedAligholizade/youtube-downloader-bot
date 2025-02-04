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
    aria2 \
    gcc \
    musl-dev \
    python3-dev \
    tor

# Configure Tor
RUN echo "SocksPort 9050" >> /etc/tor/torrc && \
    echo "DataDirectory /var/lib/tor" >> /etc/tor/torrc

# Install yt-dlp using pip and upgrade to latest version
RUN pip3 install --no-cache-dir --upgrade yt-dlp requests pysocks

# Install Node.js dependencies
COPY package*.json ./
RUN npm install

# Copy application files
COPY . .

# Start Tor and the application
CMD tor & sleep 5 && npm start 