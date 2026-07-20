FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the application
COPY . .

# Expose the API port
EXPOSE 5000

# Command to run the application
CMD ["npm", "start"]
