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
    vm.connected = ko.observable() // useful for clients (and server's client) to know the socket state
    vm.serverInfo = new serverInfo() // for server mode only

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
                // start server
                sockets
                    .server()
                    .connect()
                    .then(() => sockets.onIpReady((ip) => vm.IP(ip)).getIpAddress())
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
        si.isRunning = ko.observable() // serveris currently running?
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
