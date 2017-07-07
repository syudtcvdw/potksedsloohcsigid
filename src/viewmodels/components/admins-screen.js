const vm = function (params) {
		let vm = this

		vm.updateName = ko.observable()
		vm.profileEmail = ko.observable()
		vm.isEditEmail = ko.observable(false)
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
				// check if edit email is checked
				if (vm.isEditEmail()) {
						// do an api call
						let updateData = {
								uid: VM
										.controlVm
										.schoolUid(),
								email: vm
										.controlVm
										.personEmail()
						}
						api
								.p('school/update-email', updateData)
								.then(data => {
										if (!data.status) 
												VM.notify(data.msg, 'error')
												// update successful
										vm.updatingProfile(false)
										VM.notify('Update successful!')
										console.log('Update successful!')
								})
								.catch(err => {
										console.log(err)
										VM.notify('Unable to reach authentication servers, check your network connection.', 'error', {
												'try again': () => {
														// try again logic goes here...
												}
										})
								})
				} else {
						// update admin's name
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
												VM
														.controlVm
														.personName(data.response.name)
												VM.notify("Profile update successful")
												_.delay(vm.fetchAdmins, 500)
										} else 
												VM.notify("Profile update failed", "warn")
								}
								vm.updatingProfile(false)
						})
				}
				// change password retrieve first admin's password
		}

		/**
	 * Delete admin
	 */
		vm.deleteAdmin = (admin) => {
				// remove an admin
		}

		/**
		 * Add new admin
		 */
		vm.addAdmin = () => {
				if (_anyEmpty(vm.newName(), vm.newEmail(), vm.newPwd(), vm.confNewPwd())) 
						return VM.notify('Please fill in all fields.', 'warn')
				if (vm.newPwd() !== vm.confNewPwd()) 
						return VM.notify('The passwords do not match', 'warn');
				
				// Go ahead and add admin.
				vm.addingAdmin(true)
				sockets.emit('add admin', {
						'name': vm.newName(),
						'email': vm.newEmail(),
						'password': vm.newPwd()
				}, (data) => {
						if (!data.status) 
								VM.notify('Could not add admin: no response from the Control Workstation.', 'error', {
										'try again': () => {
												vm.addingAdmin(true)
												vm.addAdmin()
										}
								}, 'add admin')
						else {
								if (typeof data.response == 'object') {
										vm
												.admins
												.push(new Admin(data.response))

										// clear inputs
										_resetForm('#add-admin-form')
								} else 
										VM.notify(data.response, 'error')
						}
						vm.addingAdmin(false)
				})
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
				vm.profileEmail(VM.controlVm.personEmail())
		}

		// init
		vm.fetchAdmins()
		loadMyProfile()
		_.defer(() => tooltip.refresh())
}

new Component('admins-screen')
		.def(vm)
		.load()