FROM node:10.15.3-slim
RUN apt-get update && apt-get install -y apt-utils cron git
RUN mkdir /apisnippets
COPY index.js /apisnippets/index.js
COPY package.json /apisnippets/package.json
COPY package-lock.json /apisnippets/package-lock.json
COPY pull_and_trigger.sh /apisnippets/pull_and_trigger.sh
COPY startdocker.sh /apisnippets/startdocker.sh
COPY crontab /etc/crontab
WORKDIR /apisnippets
RUN npm install -y
EXPOSE 3030/tcp
CMD ["./startdocker.sh"]
