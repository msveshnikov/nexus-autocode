FROM node:20-slim


WORKDIR /app

COPY package*.json ./

ENV PUPPETEER_SKIP_DOWNLOAD 1 
RUN npm install

COPY . .


EXPOSE 5000 

CMD ["node", "index.js"]