const vm = function (params) {
    let vm = this

    // props
    let controlla
    vm.info = "Click on a class to view and manage it."

    // observables
    vm.classes = ko.observableArray()
    vm.newClass = ko.observable()
    vm.classDetail = ko.observable()
    vm.newClassActionName = ko.observable()

    // states
    vm.connected = ko.observable(false)
    vm.classesFetchFailed = ko.observable(false)
    vm.loadingClasses = ko.observable(false)

    // behaviours
    vm.addClass = () => {
        vm.newClassActionName("Add New Class")
        vm.newClass(new Klass)
        _tooltip()
    }
    vm.dismissAdd = () => {
        vm.newClass(null)
        _tooltip()
    }
    vm.loadClasses = () => {
        vm.classesFetchFailed(false)
        vm.loadingClasses(true)
        sockets.emit('get all classes', null, data => {
            vm.loadingClasses(false)
            if (!data.status) {
                vm.classesFetchFailed(true)
                VM.notify("Unable to fetch classes list, could not reach Control Workstation", "error", {
                    'try again': vm.loadClasses
                }, 'retry load classes')
            } else {
                vm.classesFetchFailed(false)
                if (data.response) {
                    vm
                        .classes
                        .removeAll()
                    data
                        .response
                        .map(c => {
                            vm
                                .classes
                                .push(new Klass(c))
                        })
                    vm.connected(true)
                    _tooltip()
                }
            }
        }, true)
    }

    // sub-vm
    function Klass() {
        let c = this
        let args = arguments.length > 0
            ? arguments[0]
            : {}

        // props
        c._id = ko.observable(args._id || '')
        c.name = ko.observable(args.name || '')
        c.code = ko.observable(args.code || '')
        c.addDate = ko.observable(args.addDate || null)

        // states
        c.saving = ko.observable(false)

        // behaviours
        c.save = () => {
            if (_anyEmpty(c.name(), c.code())) 
                return VM.notify("Do not leave any detail empty", "warn")

            let klass = ko.toJS(c)
            delete klass.saving // not needed

            if (_new) {
                // add
                c.saving(true)
                klass.addDate = klass.addDate
                    ? klass.addDate
                    : _getUTCTime() / 1000 // to secs
                delete klass._id
                sockets.emit('add class', klass, data => {
                    if (!data.status) 
                        return c.saving(false),
                        VM.notify('Problem creating class, could not reach Control Workstation', 'error', {
                            'try again': c.save
                        }, 'retry add class')
                    else {
                        console.log(data)
                        if (typeof data.response == 'object') {
                            VM.notify('Class created successfully.')
                            vm
                                .classes
                                .push(new Klass(data.response))
                            vm.addClass()
                        } else if (data.response === false) 
                            VM.notify('Unable to create class', 'error')
                        else 
                            VM.notify(data.response, 'error')
                        c.saving(false)
                    }
                })
            } else {
                // edit
                c.saving(true)
                sockets.emit('edit class', klass, data => {
                    if (!data.status) 
                        return c.saving(false),
                        VM.notify('Problem editing class, could not reach Control Workstation', 'error', {
                            'try again': c.save
                        }, 'retry edit class')
                    else {
                        if (data.response) 
                            VM.notify("Class updated successfully")
                        else 
                            VM.notify("Unable to update class")
                        c.saving(false)
                    }
                })
            }
        }
        c.open = () => {
            vm.classDetail(new ClassDetail(c))
            controlla.next()
        }
        c.contextmenu = (o, e) => {
            VM
                .contextmenu
                .prep(e)
                .show({'Manage': c.open, 'Edit class': c.edit, 'Delete': c.remove, 'Refresh list': vm.loadClasses})
        }
        c.edit = () => {
            vm.newClassActionName('Edit Class')
            vm.newClass(c)
        }
        c.remove = () => {
            sockets.emit('remove class', c.code(), data => {
                if (!data.status) 
                    VM.notify('Problem removing class, could not reach Control Workstation', 'error', {
                        'try again': c.remove
                    }, 'retry remove class')
                else {
                    if (!data.response) 
                        VM.notify("Unable to remove class", "error")
                    else 
                        vm
                            .classes
                            .remove(c)
                    }
            })
        }

        // init
        let _new = !c._id()
    }

    function ClassDetail(klass) {
        let c = this
        if (!klass) 
            return;
        
        // props
        c.me = klass
        // behaviours
        c.back = () => controlla.prev()
    }

    // init
    _.defer(() => {
        controlla = $('.sectionizr').sectionize()
        vm.loadClasses()
    })

}

new Component('classes-screen')
    .def(vm)
    .load()