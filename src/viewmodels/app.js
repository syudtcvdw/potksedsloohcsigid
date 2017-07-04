const {remote, BrowserWindow} = require('electron')
const currentWindow = remote.getCurrentWindow()
const sockets = require(__dirname + '/imports/_sockets.js')

// import components
require(COMPONENTS_PATH + 'splash-screen.js')
require(COMPONENTS_PATH + 'start-screen.js')
require(COMPONENTS_PATH + 'login-screen.js')
require(COMPONENTS_PATH + 'home-screen.js')
require(COMPONENTS_PATH + 'control-frame.js')

// empty component
ko
    .components
    .register('no-view', {template: '<div />'});

var VM = new function () {
    var vm = this

    // props
    vm.socket = null // keeps a pointer to the socket connection
    vm.controlVm = null // keeps a pointer to the control-frame vm

    // observables
    vm.pagedata = ko.observable() // interpage data transmitted via component's params
    vm.view = ko.observable('splash-screen') // what view is loaded in <main />
    vm.MODE = ko.observable() // system's running mode, server or client
    vm.IP = ko.observable() // server IP address
    vm.ROLE = ko.observable() // logged in user's role as far as the system is concerned: Admin, Teacher, blah blah
    vm.connectionInfo = ko.observable() // connection info
    vm.notifs = new notifs() // notifications viewmodel

    // tmp
    vm.RESETDB = ko.observable(true)

    // behaviours
    vm.loadView = (view, data = {}) => {
        vm.pagedata(data)
        vm.view(view)
    }

    // subscriptions
    vm
        .MODE
        .subscribe((m) => {
            if (m == SERVER) {
                // instantiate connection info
                vm.connectionInfo(new serverInfo())
                // start server
                sockets
                    .server()
                    .connect()
                    .then(() => sockets.onIpReady((ip) => vm.IP(ip)).getIpAddress())
            } else {
                // instantiate connection info
                vm.connectionInfo(new clientInfo())
            }
        })
    vm
        .IP
        .subscribe((ip) => {
            if (vm.MODE() == SERVER) {
                // connect to self as client too
                sockets
                    .client(ip)
                    .connect()
                    .then((sock) => {
                        vm.socket = sock
                        console.log(`Connection successful: ${ip}`)
                    })
                    .catch((e) => console.log(`Connection error: ${e}`))
            }
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
        }
        si.countDown = () => {
            si.population(si.population() - 1)
        }

        // computed
        si.popuReport = ko.computed(() => {
            return `${si.population()} Workstation${si.population() != 1? 's':''}`
        })
    }
    function clientInfo() {
        let ci = this
        
        // observables
        ci.connected = ko.observable()
    }
    function notifs() {
        let nt = this

        // observables
        nt.sticky = ko.observable()
        nt.notifs = ko.observableArray()

        // behaviours
        nt.add = (msg, actions = null) => {
            nt.notifs.push(new Notif(msg, actions))
        }

        /**
         * Local vm for each notification
         * @param {string} msg The message to display
         * @param {map} actions An object map of action to callback
         */
        function Notif(msg, actions) {
            let n = this

            // props
            n.msg = ko.observable(msg || 'Welcome to Digischools')
            n.actions = ko.observableArray()
            n.leaving = ko.observable(false)
            if (typeof actions != 'undefined')
                for (let a in actions) n.actions.push(a)

            // behaviours
            n.doAction = (d) => {
                console.log(d)
            }
            n.die = () => {
                nt.notifs.remove(n)
            }

            // init
            if (n.actions().length == 0) new Promise((resolve) => {
                setTimeout(() => (n.leaving(true), resolve()), 5000)
            }).then(() => {
                setTimeout(() => n.die(), 250)
            })
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
});
