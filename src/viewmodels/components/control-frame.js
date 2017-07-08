var vm = function (params) {
    let vm = this

    // props
    let menuItems = [{id: 'admins', label: 'Admin profiles'}]
    vm.schoolUid = '' // what the school uid is
    vm.personId = '' // what the logged in person's _id is

    // observables
    vm.schoolName = ko.observable() // what school is this
    vm.personName = ko.observable() // who's currently logged in
    vm.personEmail = ko.observable() // email address of currently logged in guy
    vm.superAdmin = ko.observable(false) // tells if logged in guy is superadmin
    vm.disconnectionTime = ko.observable() // what time the connecion the server was lost
    vm.menu = ko.observableArray() // what time the connecion the server was lost

    // computed
    vm.isServer = ko.computed(() => {
        return VM.MODE() == SERVER
    })
    vm.ipTooltip = ko.computed(() => {
        if (!VM.connectionInfo()) 
            return;
        return vm.isServer()
            ? `Other workstations in your institution can connect to this server via this address: ${VM.IP()}`
            : `You are currently${ !VM
                .connectionInfo()
                .connected()
                ? ' NOT'
                : ''} connected to the Control Workstation at ${VM.IP()}`
    })

    // subscriptions
    VM
        .ROLE
        .subscribe(() => _.defer(() => tooltip.refresh()))
    vm
        .ipTooltip
        .subscribe(() => {
            console.log('refreshing tooltip')
            _.defer(() => tooltip.refresh())
        })

    // sub vm
    function MenuItem(id, label) {
        if (!id || !label) 
            return;
        let m = this

        // observables
        m.id = id
        m.label = label
        m.target = id + '-screen'

        // computed
        m.isActive = ko.computed(() => {
            return m.target == VM.view()
        })
        m.icon = ko.computed(() => {
            return `resx/icons/${m.id}${m.isActive()? '-inv':''}.png`
        })
    }

    // init
    VM.controlVm = vm
    // load up menu
    menuItems.map(m => vm.menu.push(new MenuItem(m.id, m.label)))
    _.defer(() => {
        $('control-frame').append("<script src='./imports/ext/tooltip.min.js'></script>")
        tooltip.setOptions({offsetDefault: 10})
    })
}

new Component('control-frame')
    .def(vm)
    .load()