var vm = function (params) {
    let vm = this

    // observables
    vm.loginEmail = ko.observable('')
    vm.loginPwd = ko.observable('')
    vm.loginErr = ko.observable()
    vm.loading = ko.observable(false)
    vm.seen = ko.observable(true)

    // behaviors
    vm.validateCreds = () => {
        vm.loading(true)
        if (_anyEmpty(vm.loginEmail(), vm.loginPwd())) 
            vm.loginErr("All fields are required.");
        
        // send info to socket
        sockets.emit('logon', {
            'email': vm.loginEmail(),
            'password': vm.loginPwd()
        }, (data) => {
            if (!data.status) 
                vm.loginErr("No response from Control Workstation")
            else {
                if (data.response) {
                    // remember this email address
                    let DbSettings = db('settings')
                    DbSettings.iu({
                        label: 'lastEmail',
                        value: vm.loginEmail()
                    })

                    // go on
                    if (VM.MODE() != SERVER) 
                        VM.notify("Login successful, welcome")
                    vm.seen(false)
                    vm.start(data.response)
                } else 
                    vm.loginErr("Username/password incorrect!")
            }
        }, quiet = true)
    }
    vm.dismissLoading = () => {
        vm.loading(false)
        vm.loginErr(null)
    }
    vm.start = (data) => {
        vm.seen(false)
        VM.ROLE(data.role)
        VM
            .controlVm
            .personName(data.info.name)
        VM
            .controlVm
            .superAdmin(data.info.is_first)
        VM
            .controlVm
            .personEmail(data.info.email)
        VM.controlVm.personId = data.info._id

        VM.loadView('teachers-screen')
    }

    // init
    if (typeof params.firstRun != 'undefined' && VM.MODE() == SERVER) {
        /**
         * in the unlikely event that the settings table is cleared
         * while the admins table is left intact,
         * the iu operation performed on the admin's details may return null
         * leaving the _id undefined, we do a fresh db request here regardless to ensure
         * that all information is intact before proceeding to the next screen
         */
        let DbAdmins = db('admins')
        DbAdmins
            .findOne({email: params.info.email})
            .execAsync()
            .then(d => {
                if (d) 
                    params.info._id = d._id
                vm.start(params) // don't require logon from server-running admin on first run
            })
            .catch(() => {})
    }
    let DbSettings = db('settings')
    DbSettings
        .findOne({label: 'lastEmail'})
        .execAsync()
        .then(d => vm.loginEmail(d.value))
        .catch(() => {})
}

new Component('login-screen')
    .def(vm)
    .load()