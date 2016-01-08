FROM iron/node

WORKDIR /app
ADD . /app

ENTRYPOINT ["node", "/app/node_modules/.bin/iron-lambda", "exec"]
