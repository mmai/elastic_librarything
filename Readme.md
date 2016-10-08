# Elastic librarything

A node script to import librarything data into elasticsearch

## Installation

* Install [docker compose](https://docs.docker.com/compose/install/)
* build docker instances `docker-compose up -d`
* copy settings.dist.js to settings.js and set your Librarything username in *librarything.userid*, you can change the name of the elasticsearch index if you want
* launch import script `node ./elastic_librarything.js --reset`

## View data

* make sure docker instances are started `docker-compose start`
* open the page *http://127.0.0.1:5601* in your web browser 
* configure an index pattern in kibana
  * unselect 'index contains time-based events'
  * replace `logstash-*` by the elasticsearch.index you configured in settings.js 
  * click *Create*
* explore your data in the *Discover*, *Visualize* and *Dashboard* pages.
