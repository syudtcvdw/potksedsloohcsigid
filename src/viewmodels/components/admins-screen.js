const vm = function (params) {
    let vm = this

    vm.fetchingAdmins = ko.observable(false)
    vm.addingAdmin = ko.observable(false)
    vm.updatingProfile = ko.observable(false)
    vm.isEditEmail = ko.observable(false)
    vm.noAdmins = ko.observable(false)

    vm.profileName = ko.observable()
    vm.profileEmail = ko.observable()

    vm.newName = ko.observable()
    vm.newEmail = ko.observable()
    vm.newPwd = ko.observable()
    vm.confNewPwd = ko.observable()

    vm.admins = ko.observableArray()
    vm.selectedAdmin = ko.observable()

    // behaviours
    vm.updateCreds = () => {
        if (vm.updatingProfile()) // quit if profile update is in progress
            return
        if (_anyEmpty(vm.profileName(), vm.profileEmail())) // no field can be empty
            return VM.notify("No field can be empty", 'warn'),
            null

        vm.updatingProfile(true) // processing has begun
        sockets.emit('update profile', { // send to the socket ( update profile )
            'name': vm.profileName(),
            '_id': VM.controlVm.personId
        }, (data) => { // response
            if (!data.status) { // no response really
                VM.notify("Profile update failed, no reponse from Control Workstation", "error")
                vm.updatingProfile(false)
            } else {
                if (data.response) { // name update successful
                    function proceed(data) {
                        // very local function to invoke for updating the name everywhere
                        VM
                            .controlVm
                            .personName(data.name)
                        if (vm.isEditEmail()) {
                            VM
                                .controlVm
                                .personEmail(data.email)
                            vm.isEditEmail(false)
                        }
                        VM.notify("Profile update successful")
                        _.delay(vm.fetchAdmins, 500)
                        vm.updatingProfile(false)
                    }
                    if (vm.isEditEmail()) { // do an api call
                        let updateData = {
                            uid: VM.controlVm.schoolUid,
                            email: vm.profileEmail()
                        }
                        api
                            .p('school/update-email', updateData)
                            .then(data => {
                                data = data.data
                                if (!data.status) 
                                    VM.notify(data.msg, 'error');
                                
                                sockets.emit('update profile', { // send to the socket ( update profile )
                                    'email': vm.profileEmail(),
                                    '_id': VM.controlVm.personId
                                }, data => {
                                    if (!data.status) { // no response really
                                        VM.notify("Error occured, email left unchanged", "warn")
                                        vm.updatingProfile(false)
                                        _.delay(vm.fetchAdmins, 500)
                                    } else {
                                        if (!data.response) {
                                            VM.notify("Error occured, email left unchanged", "warn")
                                            vm.updatingProfile(false)
                                            _.delay(vm.fetchAdmins, 500)
                                        } else 
                                            proceed(data.response)
                                    }
                                })
                            })
                            .catch(err => {
                                VM.notify('Unable to reach authentication servers, check your network connection. Email lef' +
                                        't unchanged',
                                'warn', {'try again': vm.updateCreds})
                                vm.updatingProfile(false)
                                _.delay(vm.fetchAdmins, 500)
                            })
                    } else 
                        proceed(data.response)
                } else {
                    VM.notify("Profile update failed", "warn")
                    vm.updatingProfile(false)
                }
            }
        })
    }
    // change password retrieve first admin's password

    /**
		 * Add new admin
		 */
    vm.addAdmin = () => {
        if (vm.addingAdmin()) 
            return
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
        }, data => {
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
        if (vm.fetchingAdmins()) 
            return
        vm.fetchingAdmins(true)
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

    // subscriptions
    vm.s1 = vm
        .isEditEmail
        .subscribe(b => {
            if (!b) 
                vm.profileEmail(VM.controlVm.personEmail())
        })

    // sub-vm
    function Admin(data) {
        let a = this

        // prop
        a._id = data._id || ""
        a.password = data.password || ""

        // observables
        a.name = ko.observable(data.name || "")
        a.email = ko.observable(data.email || "")
        a.superAdmin = ko.observable(data.is_first || false)

        a.newPwd = ko.observable()
        a.confPwd = ko.observable()
        a.updatingPassword = ko.observable()
        a.pwdError = ko.observable()

        // behaviours
        a.removeMe = () => {
            // you must not be able to delete yourself
            if (VM.controlVm.personEmail() === a.email()) 
                return VM.notify('You can not delete yourself.', 'error'),
                null;
            
            // you cannot delete the superadmin
            if (a.superAdmin()) {
                return VM.notify('You can not delete the super admin!', 'error'),
                null;
            }
            // remove an admin show a confirmation msg
            VM.notify('Are you sure you want to delete?', 'warn', {
                'confirm': () => {
                    // go ahead and delete this admin
                    sockets.emit('delete admin', {
                        'email': a.email()
                    }, data => {
                        if (!data.status) 
                            VM.notify('Could not remove this admin: No response from the Control Workstation.', 'error')
                        else {
                            if (!data.response) 
                                VM.notify("Unable to delete admin", "error")
                            else 
                                vm
                                    .admins
                                    .remove(a)
                            }
                    })
                }
            })
        }

        a.changePwd = () => { // pops up the curtain
            // you cannot change the super admin's password but super admin can change his
            if (a.superAdmin() && !VM.controlVm.superAdmin()) {
                return VM.notify('You cannot change the super admin\'s password', 'error'),
                null;
            }
            vm.selectedAdmin(a)
        }

        a.dismiss = () => {
            a.newPwd('')
            a.confPwd('')
            a.pwdError(null)
            vm.selectedAdmin(null)
        }

        a.doPwdUpdate = () => {
            if (_anyEmpty(a.newPwd(), a.confPwd())) 
                a.pwdError('Please fill in all fields')
            else if (a.newPwd() !== a.confPwd()) 
                a.pwdError('Passwords do not match')
            else {
                a.updatingPassword(true)
                sockets.emit('update profile', {
                    _id: a._id,
                    password: a.newPwd()
                }, data => {
                    a.dismiss()
                    a.updatingPassword(false)
                    if (!data.status) 
                        VM.notify(`Could not update password for ${a.name()}, no reply from Control Workstation`, 'error')
                    else {
                        if (data.response) {
                            a.password = a.newPwd()
                            VM.notify(`Password updated for ${a.name()}`)
                        } else 
                            VM.notify(`Could not update password for ${a.name()}`, 'error')
                    }
                })
            }
        }

    }

    // local
    function loadMyProfile() {
        vm.profileName(VM.controlVm.personName())
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