FROM node:18

WORKDIR /app
COPY ./mobile ./

RUN npm install -g expo-cli && npm install

EXPOSE 8081 19000 19001 19002
CMD ["npx", "expo", "start", "--tunnel"]
