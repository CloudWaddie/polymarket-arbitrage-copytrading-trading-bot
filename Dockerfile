FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache \
    git \
    curl \
    bash \
    ca-certificates \
    openssl \
    openvpn \
    openrc

# Install Windscribe CLI
RUN apk add --no-cache windscribe-cli || \
    (curl -fsSL https://windscribe.com/install/linux | bash)

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY tsconfig.json ./
COPY .env* ./

# Create data directory for state files
RUN mkdir -p src/data logs

# Expose port for monitoring (optional)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
echo "Starting Windscribe VPN..."\n\
windscribe login --username "$WINDSCRIBE_USERNAME" --password "$WINDSCRIBE_PASSWORD"\n\
windscribe connect HK\n\
\n\
echo "Verifying VPN connection..."\n\
sleep 5\n\
windscribe status\n\
\n\
echo "Checking IP address..."\n\
curl https://ipinfo.io\n\
\n\
echo "Starting trading bot..."\n\
npm start\n\
' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
