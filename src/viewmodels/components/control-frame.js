var vm = function (params) {
    let vm = this

    // observables
    vm.schoolName = ko.observable() // what school is this
    vm.personName = ko.observable() // who's currently logged in
    vm.personEmail = ko.observable() // email address of currently logged in guy
    vm.disconnectionTime = ko.observable() // what time the connecion the server was lost

    // computed
    vm.isServer = ko.computed(() => {
        return VM.MODE() == SERVER
    })
    vm.ipTooltip = ko.computed(() => {
        if (!VM.connectionInfo()) return;
        return vm.isServer()
            ? `Other workstations in your institution can connect to this server via this address: ${VM.IP()}`
            : `You are currently${!VM.connectionInfo().connected()? ' NOT':''} connected to the Control Workstation at ${VM.IP()}`
    })

    // subscriptions
    VM
        .ROLE
        .subscribe(() => _.defer(() => tooltip.refresh()))
    vm.ipTooltip.subscribe(() => {
        console.log('refreshing tooltip')
        _.defer(() => tooltip.refresh())
    })

    // init
    VM.controlVm = vm
    _.defer(() => {
        $('control-frame').append("<script src='./imports/ext/tooltip.min.js'></script>")
        tooltip.setOptions({offsetDefault: 10})
    })
}

new Component('control-frame')
    .def(vm)
    .load()