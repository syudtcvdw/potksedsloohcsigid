const promisifier = require('bluebird')
var exports = module.exports = {}

var Datastore = require('linvodb3')
Datastore.defaults.store = {
    db: require("level-js")
}
Datastore.dbPath = process.cwd()

// schemas defining docs (tables)
const schemas = {
    settings: {
        label: {
            type: String,
            unique: true
        },
        value: {}
    },
    admins: {
        name: String,
        password: String,
        email: {
            type: String,
            unique: true
        },
        is_first: {
            type: Boolean,
            default: false
        }
    },
    teachers: {
        name: String,
        password: String,
        addDate: Number,
        gender: String,
        email: {
            type: String,
            unique: true
        },
        phone: {
            type: String,
            unique: true
        }
    }
}

/**
 * db map, helps to ensure we only have a single instance per doc
 */
let map = {}

/**
 * Checks if specified field, according to schema definition, has unique index
 * @param {string} dbname
 * @param {string} field
 */
function _isUnique(dbname, field) {
    if (field == '_id') // _id is always unique
        return true
    let schema = schemas[dbname] || {}
    if (_.isEmpty(schema)) 
        return false;
    if (_.isEmpty(schema[field])) 
        return false;
    return typeof schema[field].unique != 'undefined'
}

/**
 * Export the heart of this module, the guy that instantiates docs
 */
module.exports = (...name) => {
    let dbs = []
    name.map((n) => {
        n = n.toLowerCase();
        if (typeof map[n] != 'undefined') 
            dbs.push(map[n])
        else {
            let schema = schemas[n] || {}
            let ds = _.isEmpty(schema)
                ? Datastore(n)
                : Datastore(n, schema, {})

            // enforce index
            if (!_.isEmpty(schema)) {
                for (let prop in schema) 
                    (typeof schema[prop].unique == 'undefined') || ds.ensureIndex({fieldName: prop, unique: true})
            }

            promisifier.promisifyAll(ds.find().__proto__)
            ds.extend({
                ___name: n,
                /**
                 * Wrapper for .insert(), to make it promise-aware
                 */
                i: function (data) {
                    return new Promise((resolve, reject) => {
                        this.insert(data, (err, doc) => (err || doc) === doc
                            ? resolve(doc)
                            : reject(err))
                    })
                },
                /**
                 * Clears all data in concerned doc
                 */
                clear: function () {
                    return new Promise((resolve, reject) => {
                        this.remove({}, {
                            multi: true
                        }, (err, num) => (err || num) === num
                            ? resolve(num)
                            : reject(err))
                    })
                },
                /**
                 * Use this for insert operations that may end up being updates
                 * Works with unique fields in the update payload
                 */
                iu: function (data) {
                    return new Promise((resolve, reject) => {
                        data = Array.isArray(data)
                            ? data
                            : [data]
                        let docs = []
                        data.forEach(function (o) {
                            let cond = []
                            for (let i in o) 
                                if (_isUnique(this.___name, i)) {
                                    let _o = {}
                                    _o[i] = o[i]
                                    cond.push(_o)
                                }
                            this.insert(o, (err, doc) => {
                                if ((err || doc) === doc) 
                                    return docs.push(doc);
                                
                                // insert failed, try update
                                if (cond.length > 0) 
                                    this.update({
                                        $or: cond
                                    }, {
                                        $set: o
                                    }, {}, (err, doc) => {
                                        if ((err || doc) === doc) 
                                            docs.push(doc)
                                    })
                                    })
                        }, this)
                        resolve(docs.length == 0
                            ? null
                            : (data.length > 1
                                ? docs
                                : docs[0]))
                    })
                },
                /**
                 * Wrapper for .save(), to make it promise-aware
                 */
                s: function (data) {
                    return new Promise((resolve, reject) => {
                        this.save(data, (err, doc) => (err || doc) === doc
                            ? resolve(doc)
                            : reject(err))
                    })
                },
                /**
                 * Checks for existence of specified value, in specified column
                 * @param {string} col The column to check
                 * @param {string} val The value to check for
                 */
                exists: function (query) {
                    return new Promise((resolve, reject) => {
                        this.findOne({
                            $or: !Array.isArray(query)
                                ? [query]
                                : query
                            })
                            .execAsync()
                            .then(d => {
                                !d
                                    ? reject()
                                    : resolve()
                            })
                            .catch(() => reject())
                    })
                }
            })
            map[n] = ds
            dbs.push(ds)
        }
    })
    return dbs.length == 1
        ? dbs[0]
        : dbs
}