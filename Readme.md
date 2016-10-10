# Elastic librarything

A node script to import librarything data into elasticsearch

## Step 0 : Install an elasticsearch docker instance (optional) 

* Install [docker compose](https://docs.docker.com/compose/install/)
* build docker instances `docker-compose up -d`

## Step 1 : Import data

* install dependencies `npm install`
* launch import script `node ./bin/elastic-librarything.js --reset`
  * with the option `--reset` to initiate the database
  * with the option `--url=http://...` to use a custom elasticsearch instance (default *http://localhost:9200*, the docker instance set in step 0)
  * with the option `--index=myindex` to use a custom elasticsearch index (default *librarything*)

## Step 2 : View data with Kibana (optional)

* Make sure docker instances are started `docker-compose start`
* open the page *http://127.0.0.1:5601* in your web browser 
* configure an index pattern in kibana
  * unselect 'index contains time-based events'
  * replace `logstash-*` by the elasticsearch.index you configured in settings.js 
  * click *Create*
* explore your data in the *Discover*, *Visualize* and *Dashboard* pages.
