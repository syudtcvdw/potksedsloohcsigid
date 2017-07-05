const vm = function (params) {
	let vm = this

	vm.updateName = ko.observable('')
	vm.updatePwd = ko.observable('')
	vm.loading = ko.observable(false)
	vm.adminDetails = ko.observableArray([
		{ sn: 1, name: 'Victor I. Afolabi', email: 'victor@vic.com', action: 'add | remove' },
		{ sn: 2, name: 'Banjo Mofesola Paul', email: 'depaule@paul.com', action: 'add | remove' },
		{ sn: 3, name: 'Dotun Longe', email: 'dedean@beats.net', action: 'add | remove' }
	])

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
	 * Dismiss loadin
	 */
	vm.dismissLoading = () => {
		vm.loading(false)
		vm.updateErr(null)
	}
}

new Component('admins-screen')
	.def(vm)
	.load()