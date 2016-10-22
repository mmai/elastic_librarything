build-docker:
	docker-compose up -d
dev:
	watchify src/main.js -t babelify -o js/main.js -v
start:
	# docker-compose start
	docker start elasticlibrarything_elasticsearch-int_1
status:
	curl http://127.0.0.1:9200/_cat/indices
reset:
	node ./bin/elastic-librarything.js aipotu --reset
view:
	# firefox http://127.0.0.1:5601
	firefox index.html
