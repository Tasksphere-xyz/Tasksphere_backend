# Use an official Node.js runtime as a base image
FROM node:18-alpine AS build

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the NestJS application
RUN npm run build


# Use a smaller Node.js runtime for the production environment
FROM node:18-slim AS production

# Set the working directory
WORKDIR /usr/src/app

# Copy only the production node_modules from the build stage
COPY --from=build /usr/src/app/node_modules ./node_modules

# Copy the built application from the build stage
COPY --from=build /usr/src/app/dist ./dist

# Create the uploads directory explicitly
RUN mkdir -p /usr/src/app/uploads

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]
