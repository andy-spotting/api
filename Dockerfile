FROM node:7.9

RUN mkdir /app
WORKDIR /app

COPY ./package.json .
RUN npm install

EXPOSE 80
CMD npm start
