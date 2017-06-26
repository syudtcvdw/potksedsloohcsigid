const {remote, BrowserWindow} = require('electron')
const currentWindow = remote.getCurrentWindow()
const sockets = require(__dirname + '/imports/sockets.js')

require(__dirname + '/viewmodels/components/start-screen.js')
require(__dirname + '/viewmodels/components/home-screen.js')

// empty component
ko
    .components
    .register('no-view', {template: '<div />'});

var VM = new function () {
    var vm = this

    // props
    vm.db = null

    // observables
    vm.view = ko.observable('start-screen')
    vm.MODE = ko.observable()
    vm.IP = ko.observable()

    // behaviours
    vm.loadView = (view) => {
        vm.view(view)
    }

    // subscriptions
    vm
        .MODE
        .subscribe((m) => {
            if (m == SERVER) {
                // client connected
                io = sockets.server().connect()
                io.on('connection', (socket) => {
                    console.log("We got a client: " + socket.id)
                })

                vm.loadView('home-screen')
                if (m == SERVER) 
                    sockets.onIpReady((ip) => vm.IP(ip)).getIpAddress()
            }
        })
    vm
        .IP
        .subscribe((ip) => {
            let _io = sockets.client(ip).connect()
            _io.on("welcome message", (m) => console.log(`From server: ${m}`))
        })

    // methods

    // TODO: make provision for state save for VMs, implement destroy()
};

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
