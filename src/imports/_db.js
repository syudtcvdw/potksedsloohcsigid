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
    students: {
        surname: String,
        firstname: String,
        othername: String,
        gender: String,
        addDate: Number
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

            let pqQueries = query
                ? [query]
                : []
            let _strict = true
            let _soloFirst = false
            let pqResult = []
            let _sort = {}
            let _limit = 0
            pq.size = 0
            pq.promisedResult = {
                resolve: null,
                reject: null
            }

            /**
             * Switch to specify findOne() on the first query instead of the default find()
             */
            pq.soloFirst = (solofirst = true) => {
                _soloFirst = solofirst
                return pq
            }
            /**
             * Run as non-strict
             */
            pq.loose = (strict = false) => {
                _strict = strict
                return pq
            }
            /**
             * Append a new query
             */
            pq.with = (query = {}) => {
                if (!query) 
                    return pq
                pqQueries.push(query)
                pq.size = pqQueries.length;
                return pq
            }
            /**
             * Sort parameters to use on the first query
             */
            pq.sort = (params = {}) => {
                if (typeof params == 'object') 
                    _sort = params
                return pq
            }
            /**
             * Limit parameter to use on the first query
             */
            pq.limit = (lim) => {
                if (!isNaN(lim)) _limit = lim
                return pq
            }
            /**
             * Execute queries
             */
            pq.exec = () => {
                return new Promise(function (resolve, reject) {
                    if (!pqQueries.length) 
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
                if (!pqQueries.length) 
                    pq.promisedResult.resolve(pqResult.length == 0? null:pqResult)
                let _query = pqQueries.shift()

                if (!firstQueryDone) {
                    firstQueryDone = true
                    DB[_soloFirst
                                ? 'findOne'
                                : 'find'](_query)
                        .sort(_sort)
                        .execAsync()
                        .then(d => {
                            if (!d) 
                                pq.promisedResult.reject(false)
                            else {
                                pqResult = Array.isArray(d)
                                    ? d
                                    : [d]
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
                if (!_matches) {
                    if (!Object.keys({query}).length) 
                        queries = {}
                    else 
                        queries
                            .$or
                            .push(query)
                    } else 
                    pqResult.map($r => {
                        let _q = query
                        _matches.map(_m => {
                            _q = _q.replace(_m, _dig($r, _m.substring(3)))
                        })
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
                if (_strict && Object.keys({comp}).length) {
                    pqResult = pqResult.filter(r => {
                        let found = result.filter(_r => {
                            let exists = false
                            for (let c in comp) {
                                if (_dig(_r, c) == _dig(r, comp[c])) 
                                    exists = true
                            }
                            return exists
                        })
                        if (found.length) {
                            delete r[query.$as] // because if the property was intended to be overwritten, it still retains its data type and casts our poor result to that type, e.g: casting an object into the string form [object Object]
                            r[query.$as] = found.length == 1
                                ? found[0]
                                : found.length == 0
                                    ? null
                                    : found
                            return true
                        }
                    })
                } else {
                    pqResult = pqResult.map(r => {
                        let found = result.filter(_r => {
                            let exists = !Object
                                .keys({comp})
                                .length // return true when there's no comparator
                                ? true
                                : false
                            for (let c in comp) {
                                if (_dig(_r, c) == _dig(r, comp[c])) 
                                    exists = true
                            }
                            return exists
                        })
                        r[query.$as] = found.length == 1
                            ? found[0]
                            : found.length == 0
                                ? null
                                : found
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

                /**
                 * Peels an object, and performs specific operation on its non-object props
                 * Further peels its object props too
                 * @param {object} bucket The bucket in which to drop matches
                 * @param {object} banana The object to peel
                 */
                function peel(bucket, banana) {
                    for (o in banana) {
                        if (typeof banana[o] == 'object') 
                            peel(bucket, banana[o])
                        else if (banana[o].toString().startsWith('$r.')) 
                            bucket[o] = banana[o].replace('$r.', '')
                    }
                }
                peel(comp, query)
                return comp
            }
        }
    })
    return dbs.length == 1
        ? dbs[0]
        : dbs
}