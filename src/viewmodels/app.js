const sockets = require(__dirname + '/imports/_sockets.js')

// import components
require(COMPONENTS_PATH + 'splash-screen.js')
require(COMPONENTS_PATH + 'start-screen.js')
require(COMPONENTS_PATH + 'login-screen.js')
require(COMPONENTS_PATH + 'control-frame.js')
require(COMPONENTS_PATH + 'home-screen.js')

require(COMPONENTS_PATH + 'admins-screen.js')
require(COMPONENTS_PATH + 'school-config.js')
require(COMPONENTS_PATH + 'teachers-screen.js')
require(COMPONENTS_PATH + 'subjects-screen.js')
require(COMPONENTS_PATH + 'classes-screen.js')
require(COMPONENTS_PATH + 'feedbacks-screen.js')

require(COMPONENTS_PATH + 'classteacher-screen.js')

// empty component
ko
    .components
    .register('no-view', {template: '<div />'});

var VM = new function () {
    var vm = this

    // enter full screen
    currentWindow.setFullScreen(true)

    // props
    vm.socket = null // keeps a pointer to the socket connection
    vm.controlVm = null // keeps a pointer to the control-frame vm
    vm.nonce = _hash()

    // observables
    vm.pagedata = ko.observable() // interpage data transmitted via component's params
    vm.view = ko.observable('splash-screen') // what view is loaded in <main />
    vm.MODE = ko.observable() // system's running mode, server or client
    vm.IP = ko.observable() // server IP address
    vm.ROLE = ko.observable() // logged in user's role as far as the system is concerned: Admin, Teacher, blah blah
    vm.connectionInfo = ko.observable() // connection info
    vm.loading = ko.observable() // toggles the loading guy on the header
    vm.skipModeSub = false // tells whether to ignore subscription update on MODE

    // sub-vms
    vm.notifs = new notifs() // notifications viewmodel
    vm.contextmenu = new contextmenu() // contextmenu viewmodel

    // tmp
    vm.RESETDB = ko.observable(true)

    // behaviours
    vm.loadView = (view, data = {}) => {
        vm.pagedata(data)
        vm.view(view)
    }

    // methods
    vm.notify = (msg, kind = "", actions = null, id = null, stubborn = false) => {
        if (id != null) 
            vm.closeNotification(id)
        vm
            .notifs
            .add(msg, kind, actions, id, stubborn)
    }
    vm.closeNotification = (id) => {
        vm
            .notifs
            .kill(id)
    }

    // subscriptions
    vm
        .MODE
        .subscribe((m) => {
            if (vm.skipModeSub) // ignore this subscription update
                return vm.skipModeSub = false,
                null
            if (m == SERVER) {
                // instantiate connection info
                vm.connectionInfo(new serverInfo())
                // start server
                sockets
                    .server()
                    .connect()
                    .then(() => sockets.onIpReady((ip) => vm.IP(ip)).getIpAddress())
            } else if (m == CLIENT) {
                // instantiate connection info
                vm.connectionInfo(new clientInfo())
            } else if (m == 'SERVER-RECON') {
                // reconnect server
                sockets
                    .reconnect()
                    .then(() => {
                        vm.skipModeSub = true
                        VM.MODE(SERVER)
                        sockets.onIpReady((ip) => vm.IP(ip)).getIpAddress()
                    })
                    .catch(() => {
                        vm.notify("Server still offline", "error", {
                            "put online": si.reconnect
                        }, 'server offline', true)
                    })
            }
        })
    vm
        .IP
        .subscribe((ip) => {
            if (ip == null) 
                return
            if (vm.MODE() == SERVER) {
                // connect to self as client too
                sockets
                    .client(ip)
                    .connect()
                    .then((sock) => {
                        vm.socket = sock
                    })
                    .catch((e) => console.log(`Connection error: ${e}`))
            }
        })
    vm
        .RESETDB
        .subscribe(() => {
            let [DbSettings,
                DbAdmins] = db('settings', 'admins')
            DbSettings.clear()
            DbAdmins.clear()
            console.log("Got db RESET command")
        })
    vm
        .view
        .subscribe(() => {
            vm.loading(false)
            vm
                .notifs
                .clear()
        })

    // sub-vm
    function serverInfo() {
        let si = this

        // observables
        si.connected = ko.observable() // server is currently running?
        si.population = ko.observable(0) // how many clients (including this one) are connected

        // behaviours
        si.countUp = () => {
            si.population(si.population() + 1)
            if (si.population() != 1) 
                vm.notify("Someone just connected to control workstation", "warn")
        }
        si.countDown = () => {
            si.population(si.population() - 1)
            if (si.population() == 0) 
                vm.notify("Server offline", "error", {
                    "put online": si.reconnect
                }, 'server offline', true)
            else 
                vm.notify("Someone disconnected", "warn")
        }
        si.reconnect = () => {
            vm.IP(null)
            si.connected(false)
            vm.MODE('SERVER-RECON')
        }

        // computed
        si.popuReport = ko.computed(() => {
            app.setBadgeCount(si.population())
            return `${si.population()} Workstation${si.population() != 1
                ? 's'
                : ''}`
        })
    }

    function clientInfo() {
        let ci = this

        // observables
        ci.connected = ko.observable(true)
        ci.ip = ko.observable() // useful for reconnection purposes

        // behaviours
        ci.reconnect = () => {
            ci.ip(VM.IP())
            vm.MODE('CLIENT-RECON')
        }
        ci.doRecon = () => {
            if (_anyEmpty(ci.ip())) 
                vm.notify("You need to enter the Server Address", 'error')
            else if (!ci.ip().match(/^([0-9]{1,3}\.){3}[0-9]{1,3}$/)) 
                vm.notify("Server address is not properly formatted", 'error')
            else {
                sockets
                    .reconnect(ci.ip())
                    .then((sock) => {
                        VM.MODE(CLIENT)
                        VM.socket = sock
                        console.log(`Reconnection successful: ${VM.IP()}`)
                        VM.IP(ci.ip())
                        let DbSettings = db('settings')
                        DbSettings.iu([
                            {
                                label: 'runMode',
                                value: VM.MODE()
                            }, {
                                label: 'serverIp',
                                value: VM.IP()
                            }
                        ])
                    })
                    .catch(e => {
                        console.log('reconnection', e)
                        vm.notify("Unable to establish connection", "error", {
                            "reconnect": ci.reconnect
                        }, "connection lost", true)
                    })
            }
        }

        // subscriptions
        ci
            .connected
            .subscribe(c => {
                if (!c) 
                    vm.notify("Connection to server lost", "error", {
                        "reconnect": ci.reconnect
                    }, "connection lost", true)
            })
    }

    function notifs() {
        let nt = this

        // observables
        nt.notifs = ko.observableArray()

        // behaviours
        nt.add = (msg, kind = "", actions = null, id = null, stubborn = false) => {
            nt
                .notifs
                .push(new Notif(msg, kind, actions, id, stubborn))
        }
        nt.clear = () => {
            // removes all notifs that are not stubborn
            nt
                .notifs()
                .map(n => {
                    if (!n.stubborn) 
                        n.die()
                })
        }
        nt.kill = (id) => {
            nt
                .notifs()
                .map(n => {
                    if (n.id == id) 
                        n.die()
                })
        }

        /**
         * Local vm for each notification
         * @param {string} msg The message to display
         * @param {string} kind The kind of notification, dictates the color
         * @param {map} actions An object map of action to callback
         */
        function Notif(msg, kind, actions, id = null, stubborn = false) {
            let n = this

            // props
            n.msg = ko.observable(msg || 'Welcome to Digischools')
            n.kind = ko.observable(kind || '')
            n.actions = ko.observableArray()
            n.id = id
            n.stubborn = stubborn
            n.leaving = ko.observable(false)
            if (actions) 
                for (let a in actions) 
                    n.actions.push(a);
        
            // behaviours
            n.doAction = (d) => {
                n.die()
                actions[d]()
            }
            n.die = () => {
                new Promise((resolve) => setTimeout(() => {
                    n.leaving(true)
                    resolve()
                }, !n.sticky()
                    ? 5000
                    : 0)).then(() => setTimeout(() => nt.notifs.remove(n), 250))
            }

            // computed
            n.sticky = ko.computed(() => {
                if (!n.actions()) 
                    return false;
                return n
                    .actions()
                    .length != 0
            })

            // init
            if (!n.sticky()) 
                n.die()
        }
    }

    function contextmenu() {
        let c = this
        // observables
        c.xpos = ko.observable(0)
        c.ypos = ko.observable(0)
        c.options = ko.observableArray()
        c.shown = ko.observable(false)
        // behaviours
        c.prep = (event) => {
            c.xpos(`${event.screenX - 3}px`)
            c.ypos(`${event.screenY - 3}px`)
            return c
        }
        c.show = (options) => {
            c
                .options
                .removeAll()
            for (let o in options) 
                c.options.push(new Menu(o, options[o]))
            c.shown(true)
        }
        c.dismiss = () => c.shown(false)
        // local
        function Menu(title, cb) {
            let m = this
            m.title = title
            m.trigger = () => {
                c.dismiss()
                cb()
            }
        }
    }
};

// ko initializations
ko.options.useOnlyNativeEvents = true
ko.options.deferUpdates = true
ko.applyBindings(VM)

// TODO: delete this from production
document.addEventListener("keydown", function (e) {
    if (e.which === 121) { //F10
        currentWindow.openDevTools()
    } else if (e.which === 116) { //F5
        location.reload()
    }
})