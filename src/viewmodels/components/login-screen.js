var vm = function(params) {
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
		if ( emptyFields(vm.loginEmail(), vm.loginPwd()) ) 
			vm.loginErr("All fields are required.")
		// send info to socket
		VM.socket.emit('logon', {'email' : vm.loginEmail(), 'password' : vm.loginPwd()}, (data) => {
			if ( data ) {
				console.log("Login Successful!")
				vm.seen(false)
				vm.start(data)
			}
			else vm.loginErr("Username/password does not exist!")
			console.dir(data)
		})
		console.log(`Email: ${vm.loginEmail()} Password: ${vm.loginPwd()}`)
	}

	vm.dismissLoading = () => {
    vm.loading(false) 
		vm.loginErr(null)
	}

	vm.start = (data) => {
		console.log("Starting...")
		console.log(`Role = ${data.role}`)
	}

	// helper functions
	function emptyFields(...fields) {
		var empty = false
		fields.forEach(items => { if (items.trim().length === 0) empty = true })
		return empty
	}

	console.log(params)
}

new Component('login-screen').def(vm).load()