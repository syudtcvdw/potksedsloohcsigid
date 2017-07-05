const vm = function (params) {
    let vm = this

    // observables
    vm.updateName = ko.observable('')
    vm.updatePwd = ko.observable('')
    vm.loading = ko.observable(false)

    // behaviors
    vm.updateCreds = () => {
        if (_anyEmpty(vm.updateName(), vm.updatePwd())) 
            return VM.notify('Fill in all fields, please', 'warn'),
            null

        vm.loading(true)
        sockets.emit('update profile', { // send to the socket ( update profile )
            'name': vm.updateName(),
            'email': VM
                .controlVm
                .personEmail(),
            'password': vm.updatePwd()
        }, (data) => {
            if (!data.status) 
                VM.notify("Profile update failed, no reponse from Control Workstation", "error")
            else {
                if (data.response) 
                    VM.notify("Profile update successful!")
                else 
                    VM.notify("Profile update failed", "warn")
            }
            vm.loading(false)
        })
        // change password retrieve first admin's password
    }
}

new Component('admins-screen')
    .def(vm)
    .load()