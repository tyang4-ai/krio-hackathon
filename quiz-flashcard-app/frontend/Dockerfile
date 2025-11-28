# React Frontend Dockerfile (Vite)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (using npm ci for reproducible builds when lock file exists)
# Fallback to npm install if lock file is missing or outdated
RUN npm install --legacy-peer-deps

# Copy application code
COPY . .

# Expose Vite dev server port
EXPOSE 3000

# Run Vite dev server with host binding for Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]
