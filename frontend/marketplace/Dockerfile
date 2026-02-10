# Frontend Dockerfile
FROM node:18-alpine AS build

WORKDIR /app

	COPY package*.json ./

	# Use npm install when package-lock.json may be missing
	RUN npm install --no-audit --no-fund

COPY . .

RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 5175

CMD ["serve", "-s", "dist", "-l", "5175"]
