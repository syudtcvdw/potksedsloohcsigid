/**
 * @author
 * Banjo Mofesola Paul
 * Chief Developer, Planet NEST
 * mofesolapaul@planetnest.org
 * Thursday, 29th June, 2017
 */

let _self, running;

module.exports = function (server) {
    // single instance
    if (running) 
        return _self

    console.log(`server up and running ${server}`)
    server.on('connection', (socket) => {
        console.log("We got a client: " + socket.id)

        socket.on('disconnect', (reason) => {
            console.log(`Client disconnected: ${socket.id} --> ${reason}`)
        })
    })

    _self = this
    running = true
}