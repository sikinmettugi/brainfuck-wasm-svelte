FROM node:14

WORKDIR /usr/src/bfi

# server
COPY ./package*.json ./
RUN npm ci
COPY ./main.js ./

# app
# TODO: use multi-stage build to build WASM
WORKDIR /usr/src/bfi/app
COPY ./app/package*.json .
COPY ./app/rollup.config.js .
RUN npm ci

COPY ./app/src/*.js ./src/
COPY ./app/src/*.svelte ./src/
COPY ./app/public/global.css ./public/
COPY ./app/public/index.html ./public/

COPY ./app/src/greeting/Cargo.toml ./src/greeting/
COPY ./app/src/greeting/src ./src/greeting/src
RUN npm build

# launch
EXPOSE 8080
WORKDIR /usr/src/bfi
CMD ["node", "main.js"]
