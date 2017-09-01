/**
 * @author
 * Banjo Mofesola Paul
 * Chief Developer, Planet NEST
 * mofesolapaul@planetnest.org
 * Thursday, 29th June, 2017
 */

let _self,
    running,
    _runningServer;

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
                db('admins')
                    .findOne(query)
                    .execAsync()
                    .then(d => {
                        if (d) {
                            VM.notify(`${d.name} just logged in`)
                            cb({role: 'ADMIN', info: d})
                        } else {
                            db('teachers')
                                .findOne(query)
                                .execAsync()
                                .then(d => {
                                    if (d) 
                                        VM.notify(`${d.name} just logged in`)
                                    cb(!d
                                        ? false
                                        : {
                                            role: 'TEACHER',
                                            info: d
                                        })
                                })
                                .catch(e => cb(false))
                        }
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
                    .sort({is_first: -1, name: 1})
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
                    .sort({assignedClass: -1, name: 1})
                    .execAsync()
                    .then(d => {
                        cb(!d
                            ? false
                            : d)
                    })
                    .catch(() => cb(false))
            })

            /**
             * Edits existing teacher
             */
            socket.on('edit teacher', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                let DbTeachers = db('teachers')
                // edit this teacher
                DbTeachers
                    .iu(query)
                    .then(d => cb(true))
                    .catch(() => cb(false))
            })

            /**
			 * Deletes teacher identified by supplied email
			 */
            socket.on('remove teacher', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                db("teachers").remove({
                    email: query
                }, {}, (err, num) => {
                    let r = !err && num > 0
                    if (r) {
                        db('classes').update({ // deassign classteacher
                            classteacher: query
                        }, {
                            $set: {
                                classteacher: ''
                            }
                        }, () => null)
                        db('roster').remove({ // remove all roster entries
                            teacher: query
                        }, {
                            multi: true
                        }, (err, num) => null)
                    }
                    cb(r)
                })
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
                query = query.payload || null // we're nulling it here cos sending in an actual query is an exception for this guy, so it defaults to null
                let DbSubjects = db('subjects')
                let q = DbSubjects.join({})

                if (query) {
                    q.with ({
                        $table: 'roster',
                        $as: 'teacher',
                        $query: {
                            $and: [
                                {
                                    class: query
                                }, {
                                    subject: '$r.code'
                                }
                            ]
                        }
                    }) .with ({
                            $table: 'teachers',
                            $as: 'teacher',
                            $query: {
                                email: '$r.teacher.teacher'
                            }
                        }) 
                        }
                    
                q
                    .loose()
                    .sort({title: 1})
                    .exec()
                    .then(d => {
                        cb(!d
                            ? false
                            : d)
                    })
                    .catch(() => cb(false))
            })

            /**
             * Edits existing subject
             */
            socket.on('edit subject', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                let DbSubjects = db('subjects')
                // edit this subject
                DbSubjects
                    .iu(query)
                    .then(d => cb(true))
                    .catch(() => cb(false))
            })

            /**
			 * Deletes subject identified by supplied code
			 */
            socket.on('remove subject', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                let [DbSubjects,
                    DbRoster] = db("subjects", "roster")
                DbSubjects.remove({
                    code: query
                }, {}, (err, num) => {
                    let r = !err && num > 0
                    if (r) 
                        DbRoster.remove({ // remove all roster entries
                            subject: query
                        }, {
                            multi: true
                        }, (err, num) => null)
                    cb(r)
                })
            })

            /**
             * Adds new class
             */
            socket.on('add class', (query, cb) => {
                if (expired(query)) 
                    return
                query = query.payload || query
                let DbClasses = db('classes')
                DbClasses
                    .exists({code: query.code})
                    .then(() => cb("This class code is already assigned"))
                    .catch(() => {
                        DbClasses
                            .i(query)
                            .then(d => cb(d))
                            .catch(() => cb(false))
                    })
            })

            /**
			 * Returns list of all classes
			 */
            socket.on('get all classes', (query, cb) => { // success: [docs]
                if (expired(query)) 
                    return
                let DbClasses = db('classes')
                DbClasses
                    .join({})
                    .with ({
                        $table: 'teachers',
                        $as: 'teacher',
                        $query: {
                            email: '$r.classteacher'
                        }
                    }) .sort({name: 1}).exec().then(d => {
                            cb(!d
                                ? false
                                : d)
                        }).catch(() => cb(false))
                    }
            )

            /**
             * Edits existing class
             */
            socket.on('edit class', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                let DbClasses = db('classes')
                // edit this subject
                DbClasses
                    .iu(query)
                    .then(d => cb(true))
                    .catch(() => cb(false))
            })

            /**
			 * Deletes class identified by supplied code
			 */
            socket.on('remove class', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                db('classes').remove({
                    code: query
                }, {}, (err, num) => {
                    let r = !err && num > 0
                    if (r) {
                        db('teachers').update({ // deassign classteacher
                            assignedClass: query
                        }, {
                            $set: {
                                assignedClass: ''
                            }
                        }, () => null)
                        db('roster').remove({ // remove all roster entries
                            class: query
                        }, {
                            multi: true
                        }, (err, num) => null)
                    }
                    cb(r)
                })
            })

            /**
             * Assigns classteacher for specified class
             */
            socket.on('assign classteacher', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                let [DbClasses,
                    DbTeachers] = db('classes', 'teachers')
                DbTeachers.update({
                    assignedClass: query.which,
                    $not: {
                        email: query.who
                    }
                }, {
                    $set: {
                        assignedClass: ''
                    }
                }, (err, doc) => {
                    DbClasses.update({
                        code: query.which
                    }, {
                        $set: {
                            classteacher: query.who
                        }
                    }, (err, doc) => {
                        DbTeachers.update({
                            email: query.who
                        }, {
                            $set: {
                                assignedClass: query.which
                            }
                        }, (err, doc) => {
                            cb(true)
                        })
                    })
                })
            })

            /**
             * Decommissions specified classteacher
             */
            socket.on('decommission classteacher', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                let [DbClasses,
                    DbTeachers] = db('classes', 'teachers')
                DbTeachers.update({
                    email: query.who
                }, {
                    $set: {
                        assignedClass: ''
                    }
                }, (err, doc) => {
                    DbClasses.update({
                        classteacher: query.who
                    }, {
                        $set: {
                            classteacher: ''
                        }
                    }, (err, doc) => {
                        cb(true)
                    })
                })
            })

            /**
             * Assigns teacher to a subject for a class on the roster
             */
            socket.on('assign teacher to subject', (query, cb) => { // success: doc
                if (expired(query)) 
                    return
                query = query.payload || query
                let DbRoster = db('roster')
                DbRoster.remove({
                    $and: [
                        {
                            class: query.class
                        }, {
                            subject : query.subject
                        }
                    ]
                }, {}, () => {
                    DbRoster.i({
                        class: query.class,
                        subject: query.subject,
                        teacher: query.teacher,
                        addDate: _getUTCTime() / 1000
                        })
                        .then(d => cb(d))
                        .catch(e => cb(false))
                })
            })

            /**
			 * Returns the roster
			 */
            socket.on('get roster', (query, cb) => { // success: {subject: teacher}
                if (expired(query)) 
                    return
                query = query.payload || query
                db('roster')
                    .find({class: query})
                    .execAsync()
                    .then(d => {
                        if (!d) 
                            cb(false)
                        else {
                            let o = {}
                            d.map(r => {
                                o[r.subject] = r.teacher
                            })
                            cb(o)
                        }
                    })
                    .catch(() => cb(false))
            })

            /**
			 * Removes specified subject from class roster
			 */
            socket.on('remove subject from roster', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                db('roster').remove({
                    $and: [
                        {
                            class: query.class
                        }, {
                            subject : query.subject
                        }
                    ]
                }, {}, (err, num) => {
                    cb(!err && num > 0)
                })
            })

            /**
             * Fetches teacher from roaster
             */
            socket.on('fetch teacher assignment data', (query, cb) => {
                if (expired(query)) 
                    return
                query = query.payload || query
                db('roster')
                    .join({teacher: query})
                    .sort({class: 1, subject: 1})
                    .with ({
                        $table: 'teachers',
                        $as: 'teacher',
                        $query: {
                            email: '$r.teacher'
                        }
                    }) .with ({
                            $table: 'classes',
                            $as: 'class',
                            $query: {
                                code: '$r.class'
                            }
                        }) .with ({
                                $table: 'subjects',
                                $as: 'subject',
                                $query: {
                                    code: '$r.subject'
                                }
                            }) .exec().then(d => {
                                    cb(d)
                                }).catch(() => cb(false))
                            }
                        )

            /**
			 * Returns list of all students for a class
			 */
            socket.on('get all students', (query, cb) => { // success: [docs]
                if (expired(query)) 
                    return
                query = query.payload
                db('students')
                    .find({class: query.class})
                    .sort({surname: 1, firstname: 1, othername: 1})
                    .execAsync()
                    .then(d => cb(!d
                        ? false
                        : d))
                    .catch(e => cb(false))
            })

            /**
             * Adds new student
             */
            socket.on('add student', (query, cb) => { // success: doc
                console.log(query)
                if (expired(query)) 
                    return
                query = query.payload || query
                db('students')
                    .i(query)
                    .then(d => cb(d))
                    .catch(() => cb(false))
            })

            /**
             * Edits existing student
             */
            socket.on('edit student', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                // edit this student
                db('students')
                    .iu(query)
                    .then(d => cb(true))
                    .catch(() => cb(false))
            })

            /**
			 * Deletes student identified by supplied id
			 */
            socket.on('remove student', (query, cb) => { // success: bool
                if (expired(query)) 
                    return
                query = query.payload || query
                db('students').remove({
                    _id: query
                }, {}, (err, num) => {
                    cb(!err && num > 0)
                })
            })

            socket.on('dump server', () => {
                console.log(_runningServer)
            })

            resolve(socket)
        }).then((socket) => {
            db('settings')
                .find({})
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
        return _getUTCTime() >= packet.expiry
    }

    _self = this
    _runningServer = server
    running = true
}