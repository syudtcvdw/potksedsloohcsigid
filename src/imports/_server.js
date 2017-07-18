/**
 * @author
 * Banjo Mofesola Paul
 * Chief Developer, Planet NEST
 * mofesolapaul@planetnest.org
 * Thursday, 29th June, 2017
 */

let _self,
    running;

/**
 * when force is true,
 * it prevents this guy from returning its existing self,
 * most likely means user triggered reconnection
 */
module.exports = function (server, force = false) {
    // single instance
    if (running && !force) 
        return _self

    VM
        .connectionInfo()
        .connected(true)
    console.log(`server up and running ${server}`)
    server.on('connection', (socket) => {
        new Promise((resolve) => {
            // send timestamp
            socket.emit('server time', _getUTCTime())

            /**
             * When client gets disconnected
             */
            socket.on('disconnect', (reason) => {
                VM
                    .connectionInfo()
                    .countDown()
                console.log(`Client disconnected: ${socket.id} --> ${reason}`)
            })

            /**
			 * Request from connected client for their specific information
			 */
            socket.on('logon', (query, cb) => { // success: {role,info}
                if (expired(query)) 
                    return
                query = query.payload || query
                let DbAdmins = db('admins')
                DbAdmins
                    .findOne(query)
                    .execAsync()
                    .then(d => {
                        if (d) 
                            VM.notify(`${d.name} just logged in`)
                        cb(!d
                            ? false
                            : {
                                role: 'ADMIN',
                                info: d
                            })
                    })
                    .catch(e => cb(false))
            })

            /**
			 * Kills connection from sender
			 */
            socket.on('kill me now', () => { // void
                socket.disconnect(true)
            })

            /**
			 * Updates said profile, identified by supplied _id
			 */
            socket.on('update profile', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                let DbAdmins = db('admins')
                DbAdmins
                    .findOne({_id: query._id})
                    .execAsync()
                    .then(d => {
                        DbAdmins
                            .iu(query)
                            .then(() => {
                                cb(query) // return the query to the person, helps ensure they update with the saved data
                            })
                    })
                    .catch(() => cb(false))
            })

            /**
			 * Returns list of all admins
			 */
            socket.on('get all admins', (query, cb) => { // success: [docs]
                if (expired(query)) 
                    return
                let DbAdmins = db('admins')
                DbAdmins
                    .find({})
                    .execAsync()
                    .then(d => {
                        cb(!d
                            ? false
                            : d)
                    })
                    .catch(() => cb(false))
            })

            /**
			 * Adds new admin to the admins table
			 */
            socket.on('add admin', (query, cb) => { // success: object, failure: error message
                if (expired(query)) 
                    return
                query = query.payload || query
                let DbAdmins = db('admins')
                DbAdmins
                    .exists({email: query.email})
                    .then(() => cb("This email address is already assigned"))
                    .catch(() => {
                        DbAdmins
                            .i(query)
                            .then(() => cb(query))
                            .catch(() => cb("Unable to add admin"))
                    })
            })

            /**
			 * Deletes admin identified by supplied _id
			 */
            socket.on('delete admin', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                let DbAdmins = db("admins")
                DbAdmins.remove({
                    $and: [
                        {
                            _id: query._id
                        }, {
                            $not: {
                                is_first: true
                            }
                        }
                    ]
                }, {}, (err, num) => {
                    cb(!err && num > 0)
                })
            })

            /**
			 * Event emitted only from Super Admin's workstation, to notify server they can make special demands
			 */
            socket.on('request elevation', (query, cb) => { // void
                query = query.payload || query
                socket.isSuper = true
                cb()
            })

            /**
			 * Updates school logo file
			 */
            socket.on('update school logo', (query, cb) => { // success: bool
                if (!socket.isSuper) 
                    return cb(false),
                    null
                if (expired(query)) 
                    return
                buf = query.payload || query
                if (!fs.existsSync(USERDATA_ASSETS_PATH)) // create the assets directory if it doesn't exist yet
                    fs.mkdirSync(USERDATA_ASSETS_PATH)
                fs.writeFile(USERDATA_ASSETS_PATH + 'logo.jpg', buf, 'binary', e => {
                    cb(!e)
                    if (!e) {
                        // compute salt
                        let salt = _hash()

                        // save up
                        let DbSettings = db('settings')
                        DbSettings
                            .iu({label: 'logoSalt', value: salt})
                            .then(() => {})
                            .catch(() => {})

                            // notify all clients
                            server
                            .emit('update your school logo', {
                                salt: salt,
                                buf: buf
                            })
                    }
                })
            })

            /**
			 * Fetches school logo if the supplied salt does not match current logo salt
			 */
            socket.on('fetch school logo', (query, cb) => { // success: {salt,buf}
                query = query.payload || query
                let DbSettings = db('settings')
                DbSettings
                    .findOne({label: 'logoSalt'})
                    .execAsync()
                    .then(d => {
                        if (d && d.value == query.salt) 
                            cb(false)
                        else {
                            console.log(USERDATA_ASSETS_PATH)
                            fs.readFile(USERDATA_ASSETS_PATH + 'logo.jpg', 'binary', (e, data) => {
                                if (e) 
                                    cb(false)
                                else 
                                    cb({
                                        salt: d
                                            ? d.value
                                            : null,
                                        buf: data
                                    })
                            })
                        }
                    })
                    .catch(e => cb(false))
            })

            /**
			 * Sets school operations & termilogies
			 */
            socket.on('set ops & term', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                let newQuery = []
                for (let i in query) 
                    newQuery.push({label: i, value: query[i]})

                let DbSettings = db('settings')
                DbSettings
                    .iu(newQuery)
                    .then(() => cb(true))
                    .catch(() => cb(false))
            })

            /**
			 * Saves school assessment metrics
			 */
            socket.on('save assessment metrics', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                let DbSettings = db('settings')
                DbSettings
                    .iu({label: 'schoolMetrics', value: query})
                    .then(() => cb(true))
                    .catch(() => cb(false))
            })

            /**
			 * Updates school profile
			 */
            socket.on('update school profile', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                let newQuery = []
                for (let i in query) 
                    newQuery.push({label: i, value: query[i]})
                let DbSettings = db('settings')
                DbSettings
                    .iu(newQuery)
                    .then(() => cb(newQuery))
                    .catch(() => cb(false))
            })

            /**
			 * Fetches school assessment metrics
			 */
            socket.on('fetch setting', (query, cb) => { // success: [Metric], expects query to be a setting label
                if (expired(query)) 
                    return
                query = query.payload || query
                let DbSettings = db('settings')
                DbSettings
                    .findOne({label: query})
                    .execAsync()
                    .then(d => {
                        if (!d) 
                            cb(false)
                        else 
                            cb(d.value)
                    })
                    .catch(e => cb(false))
            })

            /**
             * Saves the school's grading system
             */
            socket.on('save grading sys', (query, cb) => {
                if (expired(query)) 
                    return
                query = query.payload || query
                let DbSettings = db('settings')
                DbSettings
                    .iu({label: 'gradingSystem', value: query})
                    .then(() => cb(true))
                    .catch(() => cb(false))
            })

            /**
             * Adds new teacher
             */
            socket.on('add teacher', (query, cb) => {
                if (expired(query)) 
                    return
                query = query.payload || query
                let [DbTeachers,
                    DbAdmins] = db('teachers', 'admins')
                DbAdmins
                    .exists({email: query.email})
                    .then(() => cb("This email address is already assigned"))
                    .catch(() => {
                        DbTeachers
                            .exists({email: query.email})
                            .then(() => cb("This email address is already assigned"))
                            .catch(() => {
                                DbTeachers
                                    .exists({phone: query.phone})
                                    .then(() => cb("This phone number is already assigned"))
                                    .catch(() => {
                                        DbTeachers
                                            .i(query)
                                            .then(d => cb(d))
                                            .catch(() => cb(false))
                                    })
                            })
                    })
            })

            /**
			 * Returns list of all teachers
			 */
            socket.on('get all teachers', (query, cb) => { // success: [docs]
                if (expired(query)) 
                    return
                let DbTeachers = db('teachers')
                DbTeachers
                    .find({})
                    .execAsync()
                    .then(d => {
                        cb(!d
                            ? false
                            : d)
                    })
                    .catch(() => cb(false))
            })

            /**
             * Adds new subject
             */
            socket.on('add subject', (query, cb) => {
                if (expired(query)) 
                    return
                query = query.payload || query
                let DbSubjects = db('subjects')
                DbSubjects
                    .exists({code: query.code})
                    .then(() => cb("This subject code is already assigned"))
                    .catch(() => {
                        DbSubjects
                            .i(query)
                            .then(d => cb(d))
                            .catch(() => cb(false))
                    })
            })

            /**
			 * Returns list of all subjects
			 */
            socket.on('get all subjects', (query, cb) => { // success: [docs]
                if (expired(query)) 
                    return
                let DbSubjects = db('subjects')
                DbSubjects
                    .find({})
                    .execAsync()
                    .then(d => {
                        cb(!d
                            ? false
                            : d)
                    })
                    .catch(() => cb(false))
            })

            resolve(socket)
        }).then((socket) => {
            let DbSettings = db('settings')
            DbSettings
                .find({
                label: {
                    $in: [
                        'schoolUid',
                        'schoolName',
                        'schoolSlogan',
                        'schoolAddress',
                        'schoolDisplaysPositions',
                        'schoolSubSession',
                        'schoolSessionName',
                        'schoolTermsPerSession',
                        'schoolCurrentTerm'
                    ]
                }
            })
                .execAsync()
                .then(docs => {
                    let d = {}
                    for (let i in docs) 
                        d[docs[i].label] = docs[i].value
                    socket.emit('init-payload', d)
                })
            VM
                .connectionInfo()
                .countUp()
            console.log("We got a client: " + socket.id)
        })
    })

    server.on('disconnect', () => {
        VM
            .connectionInfo()
            .connected(false)
        console.log('Server: Connection dropped')
    })

    /**
	 * Determines if delivered packet is expired
	 * @param {object} packet The data to sniff
	 */
    function expired(packet) {
        if (!packet.expiry) 
            return false
        console.log(_getUTCTime(), packet.expiry)
        return _getUTCTime() >= packet.expiry
    }

    _self = this
    running = true
}