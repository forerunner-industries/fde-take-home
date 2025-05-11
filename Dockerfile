FROM node:22-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and other necessary files
COPY . .

# Build TypeScript code
RUN npm run build

# Expose the API port
EXPOSE 3000

# Run the compiled JavaScript
CMD ["npm", "run", "start"]