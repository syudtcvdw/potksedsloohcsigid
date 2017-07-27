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
        assignedClass: String,
        email: {
            type: String,
            unique: true
        },
        phone: {
            type: String,
            unique: true
        }
    },
    classes: {
        name: String,
        classteacher: String,
        addDate: Number,
        code: {
            type: String,
            unique: true
        }
    },
    subjects: {
        title: String,
        addDate: Number,
        code: {
            type: String,
            unique: true
        }
    },
    roster: {
        class: String,
        subject: String,
        teacher: String,
        addDate: Number
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
                },
                join: function (query = null) {
                    return new PendingQuery(this, query)
                }
            })
            map[n] = ds
            dbs.push(ds)
        }

        /**
         * Pending Query object, allows query concatenation and supports final execution
         * Returning a PendingQuery object helps simulate an SQL 'join' statement
         * Usage:
         * new PendingQuery(firstDoc, {q1})[.with({$table: 'what Doc to check in', $as: 'what to attach result as', $query: {new query}})[...with][.loose()][.soloFirst()]].exec()
         * Exec returns: Promise
         */
        function PendingQuery(DB, query = null) {
            let pq = this
            let firstQueryDone = false
            
            pq.queries = query
                ? [query]
                : []
            pq.result = []
            pq.size = 0
            pq._strict = true
            pq._soloFirst = false
            pq.promisedResult = {
                resolve: null,
                reject: null
            }

            /**
             * Switch to specify findOne() on the first query instead of the default find()
             */
            pq.soloFirst = (solofirst = true) => {
                pq._soloFirst = solofirst
                return pq
            }
            /**
             * Run as non-strict
             */
            pq.loose = (strict = false) => {
                pq._strict = strict
                return pq
            }
            /**
             * Append a new query
             */
            pq.with = (query) => {
                pq
                    .queries
                    .push(query)
                pq.size++;
                return pq
            }
            /**
             * Execute queries
             */
            pq.exec = () => {
                return new Promise(function (resolve, reject) {
                    if (!pq.queries.length) 
                        reject(null)
                    else {
                        pq.promisedResult.resolve = resolve
                        pq.promisedResult.reject = reject
                        performQuery()
                    }
                })
                return pq.promisedResult
            }

            /**
             * Runs all queued queries, one after the other
             */
            function performQuery() {
                if (!pq.queries.length) 
                    pq.promisedResult.resolve(pq.result)
                let _query = pq
                    .queries
                    .shift()

                if (!firstQueryDone) {
                    firstQueryDone = true
                    DB[pq._soloFirst
                                ? 'findOne'
                                : 'find'](_query)
                        .execAsync()
                        .then(d => {
                            if (!d) 
                                pq.promisedResult.reject(false)
                            else {
                                pq.result = Array.isArray(d)? d:[d]
                                performQuery()
                            }
                        })
                        .catch(e => pq.promisedResult.reject(e))
                } else {
                    if (!_query.$table || !_query.$query || !_query.$as) 
                        performQuery()
                    else {
                        DB = db(_query.$table)
                        let _q = buildQuery(_query.$query)
                        DB
                            .find(_q)
                            .execAsync()
                            .then(d => {
                                if (d) 
                                    stitchResult(d, _query)
                                performQuery()
                            })
                            .catch(e => pq.promisedResult.reject(e))
                    }
                }
            }

            /**
             * Builds our special query forms into the normal form
             * Special query form refers to the previous result as $r
             */
            function buildQuery(query) {
                query = JSON.stringify(query)
                let queries = {
                    $or: []
                }
                let _matches = query.match(/\$r\.([A-Za-z0-9\.]*)/g);
                pq
                    .result
                    .map($r => {
                        let _q = query
                        _matches.map(_m => _q = _q.replace(_m, _dig($r, _m.substring(3))))
                        queries
                            .$or
                            .push(JSON.parse(_q))
                    })
                return queries
            }

            /**
             * Stitches new result with the existing one
             * Depending on strict mode or not, eliminates non-matches
             * @param {object} result The new (incoming) result
             * @param {object} query The query on which to base the stitch
             */
            function stitchResult(result, query) {
                let comp = getComparators(query.$query)
                if (pq._strict) {
                    pq.result = pq
                        .result
                        .filter(r => {
                            let found = result.filter(_r => {
                                let exists = false
                                for (let c in comp) {
                                    if (_dig(_r, c) == _dig(r, comp[c])) 
                                        exists = true
                                }
                                return exists
                            })
                            if (found.length) {
                                r[query.$as] = found
                                return true
                            }
                        })
                } else {
                    pq.result = pq
                        .result
                        .map(r => {
                            let found = result.filter(_r => {
                                let exists = false
                                for (let c in comp) {
                                    if (_dig(_r, c) == _dig(r, comp[c])) 
                                        exists = true
                                }
                                return exists
                            })
                            r[query.$as] = found
                            return r
                        })
                }
            }

            /**
             * Gets the comparators from the query,
             * so we can compare existing result with the incoming one
             * @param {object} query
             */
            function getComparators(query) {
                let comp = {}
                for (let q in query) {
                    if (query[q].toString().startsWith('$r.')) 
                        comp[q] = query[q].replace('$r.', '')
                }
                return comp
            }
        }
    })
    return dbs.length == 1
        ? dbs[0]
        : dbs
}