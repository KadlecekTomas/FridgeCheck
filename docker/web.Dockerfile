FROM node:18

WORKDIR /app
COPY ./web ./

RUN npm install

EXPOSE 3000
CMD ["npm", "run", "dev"]
