const meow = require("meow")
const librarythingImporter = require('../src/librarythingImporter')

const cli = meow(`
  Usage
  $ elastic-librarything <librarythingUserId>

  Options
  --reset Rebuild database
  --url=<elasticsearch url> (default 'http://localhost:9200')
  --index=<elasticsearch index> (default 'librarything')
  --googlekey=<google Books api key> (default none)
  --update=<number of last entered books to retrieve> (default 50)
  `)

let elasticsearchIndex = cli.flags.hasOwnProperty("index") ? cli.flags['index'] : 'librarything'
let elasticsearchUrl = cli.flags.hasOwnProperty("url") ? cli.flags['url'] : 'http://localhost:9200'
let limit = cli.flags.hasOwnProperty("update") ? cli.flags['update'] : 50
let googleApiKey = cli.flags.hasOwnProperty("googlekey") ? cli.flags['googlekey'] : ''
let needReset = cli.flags.hasOwnProperty("reset")
let librarythingUserId = cli.input.length == 0  ? null : cli.input[0]

if (librarythingUserId === null){
  throw("missing parameter : Librarything username ")
}

const importer = librarythingImporter({
    elasticsearchIndex,
    elasticsearchUrl,
    librarythingUserId,
    googleApiKey
})

if (needReset){
  importer.initializeElastic().then(() => {
      importer.update(librarythingUserId, 100000)
    }, (err) => {console.error(err)} 
  )
} else {
  importer.update(librarythingUserId, limit)
}
  
