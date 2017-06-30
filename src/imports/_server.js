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

    console.log(`server up and running ${server}`)
    server.on('connection', (socket) => {
        new Promise(() => {
            socket.on('disconnect', (reason) => {
                console.log(`Client disconnected: ${socket.id} --> ${reason}`)
            })

            socket.on('logon', (query, cb) => {
                let [DbAdmins] = db('admins')
                DbAdmins
                    .findOne(query)
                    .execAsync()
                    .then(d => {
                        console.log(`New login via ${query.email}`)
                        cb({role: 'ADMIN'})
                    })
                    .catch(() => cb(false))
            })

            let [DbSettings] = db('settings')
            DbSettings.find({label: {$in: ['schoolUid', 'schoolName']}}).execAsync().then(docs => {
                let d = {}
                for (let i in docs) d[docs[i].label] = docs[i].value
                socket.emit('init-payload', d)
            })
            console.log("We got a client: " + socket.id)
        })
    })

    _self = this
    running = true
}