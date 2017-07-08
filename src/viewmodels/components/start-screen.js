var vm = function (params) {
    let vm = this
    let [DbSettings,
        DbAdmins] = db("settings", "admins")

    // props
    vm.serverDesc = "Choose this option if this is the only workstation Digischools is running on in " +
            "your institution, or if this is the control station for Digischools. If you have" +
            " multiple deployments of Digischools on several workstations, all workstations n" +
            "eed to be connected to the same network in order to communicate and share inform" +
            "ation back & forth."
    vm.clientDesc = "Choose this option if there is another control workstation Digischools is runnin" +
            "g on in your institution. This workstation needs to be connected to the same net" +
            "work with the control workstation in order to communicate and share information " +
            "back & forth."

    // observables
    vm.mode = ko.observable()
    vm.logonEmail = ko.observable('')
    vm.logonPwd = ko.observable('')
    vm.logonErr = ko.observable()
    vm.serverIp = ko.observable('')
    vm.loading = ko.observable(false)
    vm.enterName = ko.observable()
    vm.adminName = ko.observable()
    vm.seen = ko.observable(false)

    // behaviours
    vm.serverMode = () => {
        vm.mode(SERVER)
    }
    vm.clientMode = () => {
        vm.mode(CLIENT)
    }
    vm.dismissLogon = () => {
        if (vm.hasParams()) 
            DbSettings.clear().then(() => DbAdmins.clear(() => {
                vm.seen(true)
                vm.mode(null)
                _.defer(() => (ajs(), tooltip.refresh())) // rebind anim-js and tooltips
            }))
        else {
            vm.seen(true)
            vm.mode(null)
            _.defer(() => (ajs(), tooltip.refresh())) // rebind anim-js and tooltips
        }
    }
    vm.start = () => {
        let valid = (vm.mode() == SERVER && (vm.logonEmail().trim() && vm.logonPwd().trim())) || (vm.mode() == CLIENT && vm.serverIp().trim())
        if (!valid) 
            return vm.showError("All fields are required"),
            null;
        
        if (vm.mode() == SERVER) {
            new Promise((resolve, reject) => {
                vm.loading(true)
                let o = {
                    username: vm.logonEmail(),
                    password: vm.logonPwd()
                }
                api
                    .p('school/auth-admin', o)
                    .then(data => resolve(data))
                    .catch(err => reject(err))
            }).then(data => {
                if (!data.data.status) 
                    vm.logonErr(data.data.msg)
                else 
                    authSuccessful(data.data.response)
            }).catch(err => vm.logonErr("Unable to reach authentication servers, check your network connection"))
        } else {
            vm.serverIp(vm.serverIp().trim())
            if (!vm.serverIp().match(/^([0-9]{1,3}\.){3}[0-9]{1,3}$/)) 
                return vm.showError("Server address is not properly formatted"),
                null
            vm.loading(true)
            sockets
                .client(vm.serverIp())
                .connect()
                .then((sock) => {
                    VM.socket = sock
                    console.log(`Connection successful: ${vm.serverIp()}`)
                    VM.IP(vm.serverIp())
                    DbSettings.iu([
                        {
                            label: 'runMode',
                            value: vm.mode()
                        }, {
                            label: 'serverIp',
                            value: vm.serverIp()
                        }
                    ]).then(() => {
                        vm.advance()
                    });
                })
                .catch((e) => {
                    vm.showError("Unable to connect to Control Workstation")
                    console.log(`Connection error: ${e}`)
                })
        }
    }
    vm.dismissLoading = () => {
        vm.logonErr(null)
        if (!vm.enterName()) 
            vm.loading(false)
    }
    vm.finishAuth = () => {
        if (!vm.adminName().trim()) 
            return vm.logonErr('Please supply your name')
        DbSettings.i([
            {
                label: 'runMode',
                value: vm.mode()
            }, {
                label: 'schoolUid',
                value: vm.schoolData.uid
            }, {
                label: 'schoolName',
                value: vm.schoolData.name
            }
        ]).then(doc => {
            DbAdmins.i({
                name: vm.adminName(),
                email: vm.logonEmail(),
                password: vm.logonPwd(),
                is_first: true
            }).then(d => {
                vm.advance(d)
            }).catch(() => {
                DbSettings.clear()
                vm.logonErr("Error occured during authentication")
            })
        }).catch(err => {
            vm.logonErr("Error occured during authentication")
        })
    }
    vm.advance = (d = null) => {
        vm.seen(false)
        VM.MODE(vm.mode())
        if (typeof params.firstRun != 'undefined' && vm.mode() == SERVER) {
            // this is neccessary to ensure payload integrity as expected at login-screen
            params = _.assign(params, { 
                role: 'ADMIN',
                info: {
                    name: vm.adminName(),
                    email: vm.logonEmail(),
                    _id: d._id,
                    is_first: true
                }
            })
        }
        VM.loadView('login-screen', params)
    }

    // methods
    vm.showError = (msg) => {
        vm.logonErr(msg)
        vm.loading(true)
    }
    vm.hasParams = () => {
        return typeof params.mode != 'undefined'
    }

    // local
    function authSuccessful(data) {
        vm.schoolData = data
        vm.enterName(true)
        VM.controlVm.schoolName(data.name) // hack for setting up school name in control footer on first auth
    }

    // subscriptions
    vm.s1 = vm
        .mode
        .subscribe(() => $('#tooltip').remove())

    // init
    if (!vm.hasParams()) {
        vm.seen(true)
        _.defer(() => {
            ajs()
            tooltip.refresh()
        })
    } else {
        vm.mode(params.mode)
        params.mode == SERVER
            ? vm.advance()
            : (DbSettings.findOne({label: 'serverIp'}).execAsync().then((data) => {
                vm.serverIp(data.value)
                vm.start()
            }), vm.mode(params.mode), vm.seen(true))
    }
}

new Component('start-screen')
    .def(vm)
    .load()
