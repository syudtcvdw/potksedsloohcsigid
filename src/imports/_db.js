const promisifier = require('bluebird')
var exports = module.exports = {}

var Datastore = require('linvodb3')
Datastore.defaults.store = {
    db: require("level-js")
}
Datastore.dbPath = process.cwd()

// schema
const schemas = {
    settings: {
        label: { type: String, unique: true },
        value: { },
    },
    admins: {
        name: String,
        email: { type: String, unique: true },
        password: String,
        is_first: { type: Boolean, default: false },
    }
}

// db map
let map = {}

// export
module.exports = (...name) => {
    let dbs = []
    name.map((n) => {
        n = n.toLowerCase();
        if (typeof map[n] != 'undefined') 
            dbs.push(map[n])
        else {
            console.log(`instantiating ${n} db`)
            let schema = schemas[n] || {}
            let ds = _.isEmpty(schema)? Datastore(n) : Datastore(n, schema, {})
            promisifier.promisifyAll(ds.find().__proto__)
            ds.extend({
                i: function(data) {
                    return new Promise((resolve, reject) => {
                        this.insert(data, (err,doc) => (err || doc) === doc? resolve(doc):reject(err))
                    })
                },
                clear: function() {
                    return new Promise((resolve, reject) => {
                        this.remove({}, { multi: true }, (err, num) => (err || num) === num? resolve(num):reject(err))
                    })
                }
            })
            map[n] = ds
            dbs.push(ds)
        }
    })
    return dbs
}