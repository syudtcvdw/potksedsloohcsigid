var vm = function(params) {
	let vm = this
	
	// observables
	vm.loginEmail = ko.observable('')
	vm.loginPwd = ko.observable('')
	vm.loginErr = ko.observable()
	vm.loading = ko.observable(false)
	vm.seen = ko.observable(false)

	// behaviors
	vm.validateCreds = () => {
		vm.loading(true)
		if ( emptyFields(vm.loginEmail(), vm.loginPwd()) ) 
			vm.loginErr("All fields are required.")
		// send info to socket
		VM.socket.emit('logon', {'email' : vm.loginEmail(), 'password' : vm.loginPwd()}, (err, data) => {
			console.log(data)
		})
		console.log(`Email: ${vm.loginEmail()} Password: ${vm.loginPwd()}`)
	}

	vm.dismissLoading = () => {
    vm.loading(false) 
		vm.loginErr(null)
	}

	vm.start = () => {
		console.log("Starting...")
	}

	// helper functions
	function emptyFields(...fields) {
		var empty = false
		fields.forEach(items => { if (items.length === 0) empty = true })
		return empty
	}

}

new Component('login-screen').def(vm).load()