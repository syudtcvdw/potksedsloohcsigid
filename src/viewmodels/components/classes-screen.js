const Klass = maker('Klass')
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
        vm.newClass(new klass)
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
                                .push(new klass(c))
                        })
                    vm.connected(true)
                    _tooltip()
                }
            }
        }, true)
    }

    // sub-vm
    class klass extends Klass {
        constructor() {
            super(arguments)
            console.log(this.export())
        }

        // behaviours
        save() {
            if (_anyEmpty(this.name(), this.code())) 
                return VM.notify("Do not leave any detail empty", "warn")

            let _klass = this.export()

            if (this._new) {
                // add
                this.$saving(true)
                _klass.addDate = _klass.addDate
                    ? _klass.addDate
                    : _getUTCTime() / 1000 // to secs
                sockets.emit('add class', _klass, data => {
                    if (!data.status) 
                        return this.$saving(false),
                        VM.notify('Problem creating class, could not reach Control Workstation', 'error', {
                            'try again': this.save.bind(this)
                        }, 'retry add class')
                    else {
                        console.log(data)
                        if (typeof data.response == 'object') {
                            VM.notify('Class created successfully.')
                            vm
                                .classes
                                .push(new klass(data.response))
                            vm.addClass()
                        } else if (data.response === false) 
                            VM.notify('Unable to create class', 'error')
                        else 
                            VM.notify(data.response, 'error')
                        this.$saving(false)
                    }
                })
            } else {
                // edit
                this.$saving(true)
                sockets.emit('edit class', _klass, data => {
                    if (!data.status) 
                        return this.$saving(false),
                        VM.notify('Problem editing class, could not reach Control Workstation', 'error', {
                            'try again': this.save.bind(this)
                        }, 'retry edit class')
                    else {
                        if (data.response) 
                            VM.notify("Class updated successfully")
                        else 
                            VM.notify("Unable to update class")
                        this.$saving(false)
                    }
                })
            }
        }
        open() {
            vm.classDetail(new ClassDetail(this))
            controlla.next()
        }
        contextmenu(o, e) {
            VM
                .contextmenu
                .prep(e)
                .show({'Manage': this.open.bind(this), 'Edit class': this.edit.bind(this), 'Delete': this.delete.bind(this), 'Refresh list': vm.loadClasses})
        }
        edit() {
            vm.newClassActionName('Edit Class')
            vm.newClass(this)
        }
        delete() {
            sockets.emit('remove class', this.code(), data => {
                if (!data.status) 
                    VM.notify('Problem removing class, could not reach Control Workstation', 'error', {
                        'try again': this.delete.bind(this)
                    }, 'retry remove class')
                else {
                    if (!data.response) 
                        VM.notify("Unable to remove class", "error")
                    else 
                        vm
                            .classes
                            .remove(this)
                    }
            })
        }
    }

    function ClassDetail(klass) {
        let c = this
        let kontrolla
        if (!klass) 
            return;
        
        // props
        c.me = klass

        // behaviours
        c.back = () => controlla.prev()

        // init
        _.defer(() => kontrolla = $('.sectionizr').sectionize()[1])
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