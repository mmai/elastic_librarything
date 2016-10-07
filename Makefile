build:
	docker-compose up -d
start:
	docker-compose start
status:
	curl http://127.0.0.1:9200/_cat/indices
reset:
	node ./elastic_librarything.js --reset
fetch:
	node ./elastic_librarything.js
view:
	firefox http://127.0.0.1:5601
