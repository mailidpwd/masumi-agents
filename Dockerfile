# Pull base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy source code
COPY . .

# Expose ports for Expo
# 19000: Expo bundler
# 19001: Metro bundler
# 19002: Expo dev tools
# 8081: Metro (default for newer React Native)
EXPOSE 19000 19001 19002 8081

# Start the app
# Using --host tunnel to make it easier to access from devices outside the container network
CMD ["npx", "expo", "start", "--host", "tunnel"]
