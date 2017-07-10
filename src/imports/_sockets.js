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

        reconnect(ip = null) {
            // when no ip is supplied, we're on the server, so we should behave accordingly
            _mode = !ip
                ? SERVER
                : _mode

            return new Promise((resolve) => {
                // attempt reconnection
                if (_mode == 'SERVER') {
                    _io_server.close(() => {
                        _control.close()
                        _control = require('http').Server()
                        _io_server = require('socket.io')(_control)
                        _control.listen(9192)
                        _server(_io_server, true) // start up the server leaflet, force renew
                        resolve(_io_server)
                    })
                } else {
                    this
                        .client(ip)
                        .connect()
                        .then(socket => resolve(socket))
                        .catch(e => reject(e))
                }
            })
        },
        /**
         * Readies socket to operate in client mode
         */
        server() {
            // set up server
            _mode = 'SERVER'
            _control = require('http').Server()
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
        connect() {
            if (_mode == 'SERVER') {
                return new Promise((resolve, reject) => {
                    _control.listen(9192)
                    _server(_io_server) // start up the server leaflet
                    resolve(_io_server)
                })
            } else if (_mode == 'CLIENT') {
                return new Promise((resolve, reject) => {
                    _io_client = new require('socket.io-client')('http://' + _ip + ':9192', {reconnectionAttempts: 1})
                    _io_client.on('connect_error', e => reject(e))
                    _io_client.on('disconnect', reason => {
                        VM
                            .connectionInfo()
                            .connected(false)
                        VM
                            .controlVm
                            .disconnectionTime(`${ (new Date).getHours()}:${ (new Date).getMinutes()}`)
                        console.log(`Connection lost: ${reason}`)
                    })
                    _io_client.on('connect', () => {
                        if (VM.connectionInfo()) 
                            VM.connectionInfo().connected(true)

                        /**
                         * Initializer payload delivered from the server
                         */
                        _io_client.on('init-payload', (info) => {
                            let DbSettings = db("settings")
                            VM.controlVm.schoolUid = info.schoolUid
                            VM.controlVm.schoolSlogan = info.schoolSlogan || ''
                            VM.controlVm.schoolAddress = info.schoolAddress || ''
                            VM.controlVm.schoolDisplaysPositions = info.schoolDisplaysPositions || false
                            DbSettings.iu([
                                {
                                    label: 'schoolUid',
                                    value: info.schoolUid
                                }, {
                                    label: 'schoolName',
                                    value: info.schoolName
                                }, {
                                    label: 'schoolSlogan',
                                    value: info.schoolSlogan || ''
                                }, {
                                    label: 'schoolAddress',
                                    value: info.schoolAddress || ''
                                }, {
                                    label: 'schoolDisplaysPositions',
                                    value: info.schoolDisplaysPositions || false
                                }
                            ])
                        })

                        /**
                         * Prompt from server that a new logo is available
                         */
                        _io_client.on('update your school logo', data => {
                            _saveLogo(data)
                        })
                        resolve(_io_client)
                    })
                })
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
        },
        emit(event, data, callback, quiet = false, wait = 5000) { // wrapper for emits that require reply, includes timeout
            let settled = rejected = false
            new Promise((resolve, reject) => {
                if (!VM.socket) 
                    return reject(),
                    null
                if (!quiet) 
                    VM.loading(true) // show the loading strip
                
                data = { // bubble-wrap the payload, so server can know its validity
                    expiry: _getUTCTime() + wait,
                    payload: data
                }
                VM
                    .socket
                    .emit(event, data, (response) => {
                        if (rejected) 
                            return
                        settled = true
                        callback({status: true, response: response})
                        resolve()
                    })
                setTimeout(() => {
                    if (settled) 
                        return
                    rejected = true
                    reject()
                }, wait) // wait for response max soso seconds
            }).catch(() => {
                if (!settled) 
                    callback({status: false})
                if (!quiet) 
                    VM.loading(false) // remove the loading strip
                }).then(() => {
                if (!quiet) 
                    VM.loading(false) // remove the loading strip
                })
        }
    }
}

module.exports = getSockets()