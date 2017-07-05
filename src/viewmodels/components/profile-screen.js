const vm = function (params) {
    let vm = this

    // observables
    vm.updateName = ko.observable('')
    vm.updatePwd = ko.observable('')
    vm.updateErr = ko.observable()
    vm.loading = ko.observable(false)

    // behaviors
    vm.updateCreds = () => {
        vm.loading(true)
        if (emptyFields(vm.updateName(), vm.updatePwd())) 
            vm.updateErr('Fill in all fields, pls.')
            // send to the socket ( update profile )
        console.log(`Email: ${VM.controlVm.personEmail()}`)
        VM
            .socket
            .emit('update profile', {
                'name': vm.updateName(),
                'email': VM
                    .controlVm
                    .personEmail(),
                'password': vm.updatePwd()
            }, (data) => {
                if (data) 
                    VM.notify("Update successful!")
                else 
                    VM.notify("Update failed", "error")
            })
        // change password retrieve first admin's password

    }

    vm.dismissLoading = () => {
        vm.loading(false)
        vm.updateErr(null)
    }

    vm.start = (data) => {
        console.log('starting vm.')
        console.log(data)
    }

    // helpers
    function emptyFields(...fields) {
        var empty = false
        fields.forEach(items => {
            if (items.trim().length === 0) 
                empty = true
        })
        return empty
    }

}

new Component('profile-screen')
    .def(vm)
    .load()