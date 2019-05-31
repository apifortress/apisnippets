#!/bin/sh
cron &
git clone https://github.com/apifortress/snippets.git
node index.js
