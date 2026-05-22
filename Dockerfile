FROM node:20-bullseye

# Install compilers and interpreters for supported languages
# We need default-jdk for Java, g++ for C++, and python3 for Python
RUN apt-get update && apt-get install -y \
    default-jdk \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all the source code
COPY . .

# Build the React frontend
RUN npm run build

# Expose port (Render sets the PORT environment variable)
EXPOSE 5000

# Start the Node.js server
CMD ["node", "server.js"]
