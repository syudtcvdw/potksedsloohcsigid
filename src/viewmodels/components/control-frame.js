var vm = function (params) {
    let vm = this

    // props
    let menuItems = [
        {
            id: 'home',
            label: 'Home'
        }, {
            id: 'admins',
            label: 'Admin Profiles'
        }, {
            component: 'school-config',
            label: 'School Configuration'
        }
    ]
    vm.schoolUid = '' // what the school uid is
    vm.personId = '' // what the logged in person's _id is
    vm.schoolSlogan = '' // slogan of the school
    vm.schoolAddress = '' // address of the school
    vm.schoolDisplaysPositions = false // does the school display students' positions
    vm.schoolSubSession = 'term' // what they call subsessions in this school
    vm.schoolSessionName = '' // what session the school is in currently
    vm.schoolTermsPerSession = null // how many terms per session
    vm.schoolCurrentTerm = null // what term the school's in

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
            ? (VM.IP() != '127.0.0.1'
                ? `Other workstations in your institution can connect to this server via this address: ${VM.IP()}`
                : 'System running in solo mode, no client can connect because you\'re not on a netw' +
                    'ork')
            : `You are currently${ !VM
                .connectionInfo()
                .connected()
                ? ' NOT'
                : ''} connected to the Control Workstation at ${VM.IP()}`
    })

    // subscriptions
    VM
        .ROLE
        .subscribe(() => _.defer(() => {
            tooltip.refresh(),
            ajs()
        }))
    vm
        .ipTooltip
        .subscribe(() => {
            _.defer(() => tooltip.refresh())
        })
    vm
        .schoolName
        .subscribe(s => currentWindow.setTitle(`Digischools • ${s}`))
    vm
        .superAdmin
        .subscribe(b => {
            if (b) 
                sockets.emit('request elevation', vm.personEmail(), d => {}, true)
        })

    // sub vm
    function MenuItem(config) {
        if (!config.label) 
            return;
        let m = this

        // observables
        m.id = config.id || config.component || config.label
        m.label = config.label || ' '
        m.component = config.component || m.id + '-screen'

        // behaviours
        m.go = () => {
            VM.loadView(m.component)
        }

        // computed
        m.isActive = ko.computed(() => {
            return m.component == VM.view()
        })
        m.icon = ko.computed(() => {
            return `resx/icons/${m
                .id}${m
                .isActive()
                ? '-inv'
                : ''}.png`
        })
    }

    // init
    VM.controlVm = vm
    // load up menu
    menuItems.map(m => vm.menu.push(new MenuItem(m)))
    _.defer(() => {
        $('control-frame').append("<script src='./imports/ext/tooltip.min.js'></script>")
        tooltip.setOptions({offsetDefault: 10})
    })
}

new Component('control-frame')
    .def(vm)
    .load()