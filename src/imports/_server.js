/**
 * @author
 * Banjo Mofesola Paul
 * Chief Developer, Planet NEST
 * mofesolapaul@planetnest.org
 * Thursday, 29th June, 2017
 */

let _self,
    running;

module.exports = function (server) {
    // single instance
    if (running) 
        return _self

    VM
        .connectionInfo()
        .connected(true)
    console.log(`server up and running ${server}`)
    server.on('connection', (socket) => {
        new Promise((resolve) => {
            socket.on('disconnect', (reason) => {
                VM
                    .connectionInfo()
                    .countDown()
                console.log(`Client disconnected: ${socket.id} --> ${reason}`)
            })

            socket.on('logon', (query, cb) => { // success: {role,info}
                let [DbAdmins] = db('admins')
                DbAdmins
                    .findOne(query)
                    .execAsync()
                    .then(d => {
                        console.log(`New login attempt from: ${query.email}`)
                        if (d) 
                            VM.notify(`${d.name} just logged in`)
                        cb(!d
                            ? false
                            : {
                                role: 'ADMIN',
                                info: d
                            })
                    })
                    .catch(() => cb(false))
            })

            socket.on('kill me now', () => { // void
                socket.disconnect(true)
            })

            socket.on('update profile', (query, cb) => { // success: bool
                let [DbAdmins] = db('admins')
                DbAdmins
                    .findOne({email: query.email})
                    .execAsync()
                    .then(d => {
                        DbAdmins
                            .iu(query)
                            .then(() => {
                                console.log(`Updated profile for ${query.email}`)
                                cb(query) // return the query to the person, helps ensure they update with the saved data
                            })
                    })
                    .catch(() => cb(false))
            })

            socket.on('get all admins', (query, cb) => { // success: [docs]
                let [DbAdmins] = db('admins')
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

            resolve(socket)
        }).then((socket) => {
            let [DbSettings] = db('settings')
            DbSettings
                .find({
                label: {
                    $in: ['schoolUid', 'schoolName']
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

    _self = this
    running = true
}