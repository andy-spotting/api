FROM node:10.9.0

RUN mkdir /app
WORKDIR /app

COPY ./package.json ./package-lock.json docker-entrypoint.sh ./
RUN npm ci

EXPOSE 80
CMD ./docker-entrypoint.sh dev
