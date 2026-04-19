FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Run tests and type checks
# RUN npm run build

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
