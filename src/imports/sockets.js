/**
 * @author
 * Banjo Mofesola Paul
 * Chief Developer, Planet NEST
 * mofesolapaul@planetnest.org
 * Monday, 26th June, 2017
 */

function getSockets() {
    let _mode = "NUL",
        _control,
        _io_server,
        _io_client,
        _ipReadyCallback,
        _ip
    return {
        /**
         * Usages:
         * getSockets().server().connect()
         * getSockets().onIpReady(callback).getIpAddress()
         */

        /**
         * Readies socket to operate in client mode
         */
        server() {
            // set up server
            _mode = 'SERVER'
            _control = require('http').Server(window.app)
            _io_server = require('socket.io')(_control)

            return this
        },
        /**
         * Readies socket to operate in client mode
         * @param {string} ipAddress
         */
        client(ipAddress) {
            // set up client
            _mode = 'CLIENT'
            _ip = ipAddress

            return this
        },
        /**
         * Performs the socket connection, invokes errorCallback on error
         * @param {callback} errorCallback
         */
        connect(errorCallback) {
            if (_mode == 'SERVER') {
                _control.listen(9192)
                _io_server.on('connect_error', errorCallback || ((e) => console.log(`Connection error: ${e}`)))
                _io_server.on('connection', (socket) => {
                    console.log("New client connected: " + socket.id)
                    socket.emit('welcome message', 'Welcome on board!!')
                })
                return _io_server
            } else if (_mode == 'CLIENT') {
                _io_client = new require('socket.io-client')('http://' + _ip + ':9192', {reconnectionAttempts: 1})
                _io_client.on('connect_error', errorCallback || ((e) => console.log(`Connection error: ${e}`)))
                _io_client.on('connect', () => {
                    _io_client.on('welcome message', (m) => {
                        console.log(`Connection to server successful`)
                    })
                })
                return _io_client
            } else {
                throw "Chained calls expected, call server() or client() first - this helps the socket " +
                    "determine what mode to run in"
            }
        },
        /**
         * Closes the sockets
         */
        close() {
            _io_server
                ? _io_server.close()
                : null
            _io_client
                ? _io_client.close()
                : null
        },
        /**
         * Gets ip address, expects callback bound to onIpReady beforehand
         */
        getIpAddress() {
            console.log(Date.now())
            let ifs = require('os').networkInterfaces()
            var addresses = [];
            for (var k in ifs) {
                for (var k2 in ifs[k]) {
                    var address = ifs[k][k2];
                    if (address.family === 'IPv4' && !address.internal) {
                        addresses.push(address.address)
                    }
                }
            }

            if (!_ipReadyCallback) 
                throw "You must bind to onIpReady() before making a call to this function, the ip addre" +
                    "ss will be passed to your supplied callback"
            _.defer(() => addresses.length
                ? _ipReadyCallback(addresses[0])
                : _ipReadyCallback('127.0.0.1'))
        },
        /**
         * Accepts callback to invoke when ip is ready
         * @param {callback} callback
         */
        onIpReady(callback) {
            _ipReadyCallback = callback
            return this
        }
    }
}

module.exports = getSockets()