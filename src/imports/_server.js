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

    VM.connectionInfo().connected(true)
    console.log(`server up and running ${server}`)
    server.on('connection', (socket) => {
        new Promise((resolve) => {
            socket.on('disconnect', (reason) => {
                VM.connectionInfo().countDown()
                console.log(`Client disconnected: ${socket.id} --> ${reason}`)
            })

            socket.on('logon', (query, cb) => {
                let [DbAdmins] = db('admins')
                DbAdmins
                    .findOne(query)
                    .execAsync()
                    .then(d => {
                        console.log(`New login attempt from: ${query.email}`)
                        cb(!d
                            ? false
                            : {
                                role: 'ADMIN',
                                info: d
                            })
                    })
                    .catch(() => cb(false))
            })

            socket.on('kill me now', () => {
                socket.disconnect(true)
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
            VM.connectionInfo().countUp()
            console.log("We got a client: " + socket.id)
        })
    })

    server.on('disconnect', () => {
        VM.connectionInfo().connected(false)
        console.log('Server: Connection dropped')
    })

    _self = this
    running = true
}