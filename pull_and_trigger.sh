if [ -d "snippets" ]; then
	cd snippets
	git pull
else
  	git clone https://github.com/apifortress/snippets.git
fi;
curl http://127.0.0.1:3030/createIndex
