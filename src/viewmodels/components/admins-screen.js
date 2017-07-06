const vm = function (params) {
    let vm = this

    vm.updateName = ko.observable()
    vm.updatingProfile = ko.observable(false)
    vm.admins = ko.observableArray()
    vm.noAdmins = ko.observable(false)
    vm.fetchingAdmins = ko.observable(false)
    vm.newName = ko.observable()
    vm.newEmail = ko.observable()
    vm.newPwd = ko.observable()
    vm.confNewPwd = ko.observable()
    vm.addingAdmin = ko.observable(false)

    // behaviors
    vm.updateCreds = () => {
        if (_anyEmpty(vm.updateName())) 
            return VM.notify("Don't leave your name empty", 'warn'),
            null

        vm.updatingProfile(true)
        sockets.emit('update profile', { // send to the socket ( update profile )
            'name': vm.updateName(),
            'email': VM
                .controlVm
                .personEmail()
        }, (data) => {
            if (!data.status) 
                VM.notify("Profile update failed, no reponse from Control Workstation", "error")
            else {
                if (data.response) {
                    VM.controlVm.personName(data.response.name)
                    VM.notify("Profile update successful")
                    _.delay(vm.fetchAdmins, 500)
                }
                else 
                    VM.notify("Profile update failed", "warn")
            }
            vm.updatingProfile(false)
        })
        // change password retrieve first admin's password
    }

    /**
	 * Delete admin
	 */
    vm.deleteAdmin = (admin) => {
        // remove an admin
    }

    /**
	 * Add an admin
	 */
    vm.addAdmin = (admin) => {
        // add an admin
        if (admin) 
            vm.adminDetails.push(admin)

    }

    /**
     * Fetches list of all admins from the server
     */
    vm.fetchAdmins = () => {
        vm.fetchingAdmins(true)
        console.log('Fetching admins')
        sockets.emit("get all admins", {}, data => {
            vm.fetchingAdmins(false)
            if (!data.status)
                vm.noAdmins(true)
            else {
                if (!data.response) 
                    vm.noAdmins(true)
                else {
                    vm.noAdmins(false)
                    vm
                        .admins
                        .removeAll()
                    data
                        .response
                        .map(a => {
                            vm
                                .admins
                                .push(new Admin(a))
                        })
                }
            }
        })
    }

    // sub-vm
    function Admin(data) {
        let a = this

        // observables
        a.name = ko.observable(data.name || "")
        a.email = ko.observable(data.email || "")
        a.password = ko.observable(data.password || "")
    }

    // local
    function loadMyProfile() {
        vm.updateName(VM.controlVm.personName())
    }

    // init
    vm.fetchAdmins()
    loadMyProfile()
}

new Component('admins-screen')
    .def(vm)
    .load()