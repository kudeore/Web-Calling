# /Dockerfile

# ---- Stage 1: Build the React Frontend ----
# Use a Node.js image to have npm available
FROM node:18-alpine AS build

# Set the working directory for the client
WORKDIR /app/client

# Copy client's package.json and package-lock.json
COPY client/package*.json ./

# Install client dependencies
RUN npm install

# Copy the rest of the client's source code
COPY client/ ./

# Build the React app for production
RUN npm run build


# ---- Stage 2: Setup the Node.js Backend Server ----
# Use a lean Node.js image for the final container
FROM node:18-alpine

# Set the working directory for the server
WORKDIR /app

# Copy server's package.json and package-lock.json
COPY server/package*.json ./

# Install server dependencies
RUN npm install --production

# Copy the server's source code
COPY server/ ./

# Copy the built frontend from the 'build' stage
COPY --from=build /app/client/build ./client/build

# Expose the port the server will run on
EXPOSE 5000

# The command to start the server
CMD [ "node", "server.js" ]