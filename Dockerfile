FROM node:10.9.0 as builder

RUN mkdir /app
WORKDIR /app

COPY ./package.json ./package-lock.json .babelrc ./
COPY ./src /app/src
RUN npm ci
RUN npm run build


FROM node:10.9.0-alpine

RUN mkdir /app
WORKDIR /app

COPY ./package.json ./package-lock.json docker-entrypoint.sh ./
COPY --from=builder /app/dist /app/dist
RUN npm ci --only=production

EXPOSE 80
CMD ./docker-entrypoint.sh start
