FROM node:10.14-slim
COPY . /algorithm
WORKDIR /algorithm
CMD ["node","app"]