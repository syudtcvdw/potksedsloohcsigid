const {remote, BrowserWindow} = require('electron')
const currentWindow = remote.getCurrentWindow()
const sockets = require(__dirname + '/imports/_sockets.js')

// import components
require(COMPONENTS_PATH + 'splash-screen.js')
require(COMPONENTS_PATH + 'start-screen.js')

// empty component
ko
    .components
    .register('no-view', {template: '<div />'});

var VM = new function () {
    var vm = this

    // props
    vm.db = null
    vm.socket = null

    // observables
    vm.pagedata = ko.observable()
    vm.view = ko.observable('splash-screen')
    vm.MODE = ko.observable()
    vm.IP = ko.observable()

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
                // client connected
                let _io = sockets
                    .server()
                    .connect()
                    .then(() => sockets.onIpReady((ip) => vm.IP(ip)).getIpAddress())
            }
        })
    vm
        .IP
        .subscribe((ip) => {
            if (vm.MODE() == SERVER) { // connect to self as client too
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

    // methods

    // TODO: make provision for state save for VMs, implement destroy()
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
