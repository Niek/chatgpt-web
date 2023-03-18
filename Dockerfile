FROM node:18

ADD . /work
WORKDIR /work

RUN npm ci

CMD ["bash"]
