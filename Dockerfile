FROM node:26-alpine

ADD . /work
WORKDIR /work

RUN npm ci

CMD ["npm", "run", "dev:public"]
