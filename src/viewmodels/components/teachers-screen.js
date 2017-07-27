const [Teacher,
    klass] = maker('Teacher', 'klass')
const vm = function (params) {
    let vm = this

    // props
    let controlla
    vm.info = "Click on a teacher's name to view their details, and manage them."

    // observables
    vm.teachers = ko.observableArray()
    vm.newTeacher = ko.observable()
    vm.confirmPassword = ko.observable()
    vm.teacherDetail = ko.observable()
    vm.newTeacherActionName = ko.observable()

    // states
    vm.connected = ko.observable(false)
    vm.teachersFetchFailed = ko.observable(false)
    vm.loadingTeachers = ko.observable(false)

    // behaviours
    vm.addTeacher = () => {
        vm.newTeacherActionName('Add New Teacher')
        vm.confirmPassword(null)
        vm.newTeacher(new teacher)
        _tooltip()
    }
    vm.dismissAdd = () => {
        vm.newTeacher(null)
        _tooltip()
    }
    vm.loadTeachers = () => {
        vm.teachersFetchFailed(false)
        vm.loadingTeachers(true)
        sockets.emit('get all teachers', null, data => {
            vm.loadingTeachers(false)
            if (!data.status) {
                vm.teachersFetchFailed(true)
                VM.notify("Unable to fetch teachers list, could not reach Control Workstation", "error", {
                    'try again': vm.loadTeachers
                }, 'retry load teachers')
            } else {
                vm.teachersFetchFailed(false)
                if (data.response) {
                    vm
                        .teachers
                        .removeAll()
                    data
                        .response
                        .map(t => {
                            vm
                                .teachers
                                .push(new teacher(t))
                        })
                    vm.connected(true)
                    _tooltip()
                }
            }
        }, true)
    }

    // sub-vm
    class teacher extends Teacher {
        constructor() {
            super(arguments)
        }

        // behaviours
        save() {
            if (_anyEmpty(this.name(), this.email(), this.phone(), this._new
                ? this.password()
                : 'empty')) 
                return VM.notify("Do not leave any detail empty", "warn")

            let _teacher = this.export()
            if (this._new) {
                // add
                if (this.password() != vm.confirmPassword()) 
                    return VM.notify("Passwords do not match, use the reveal buttons to comfirm", "error")

                this.$saving(true)
                _teacher.addDate = _teacher.addDate
                    ? _teacher.addDate
                    : _getUTCTime() / 1000 // to secs

                sockets.emit('add teacher', _teacher, data => {
                    if (!data.status) 
                        return this.$saving(false),
                        VM.notify('Problem adding teacher, could not reach Control Workstation', 'error', {
                            'try again': this
                                .save
                                .bind(this)
                        }, 'retry add teacher')
                    else {console.log(data)
                        if (typeof data.response == 'object') {
                            VM.notify('Teacher added successfully.')
                            vm
                                .teachers
                                .push(new teacher(data.response))
                            vm.addTeacher()
                        } else if (data.response === false) 
                            VM.notify('Unable to add teacher', 'error')
                        else 
                            VM.notify(data.response, 'error')
                        this.$saving(false)
                    }
                })
            } else {
                // edit
                if (this.password() !== vm.confirmPassword()) 
                    VM.notify("Passwords do not match, use the reveal buttons to confirm", "error")
                this.$saving(true)
                sockets.emit('edit teacher', _teacher, data => {
                    if (!data.status) 
                        return this.$saving(false),
                        VM.notify('Problem editing teacher, could not reach Control Workstation', 'error', {
                            'try again': this
                                .save
                                .bind(this)
                        }, 'retry edit teacher')
                    else {
                        if (data.response) 
                            VM.notify("Details updated successfully")
                        else 
                            VM.notify("Unable to update profile", "error")
                        this.$saving(false)
                    }
                })
            }
        }
        open() {
            vm.teacherDetail(new TeacherDetail(this))
            controlla.next()
        }
        contextmenu(o, e) {
            VM
                .contextmenu
                .prep(e)
                .show({
                    'Manage': this
                        .open
                        .bind(this),
                    'Edit profile': this
                        .edit
                        .bind(this),
                    'Delete': this
                        .remove
                        .bind(this),
                    'Refresh list': vm.loadTeachers
                })
        }
        edit() {
            vm.newTeacherActionName('Edit Teacher Details')
            vm.confirmPassword(this.password())
            vm.newTeacher(this)
        }
        remove() {
            sockets.emit('remove teacher', this.email(), data => {
                if (!data.status) 
                    VM.notify('Problem deleting teacher, could not reach Control Workstation', 'error', {
                        'try again': this
                            .remove
                            .bind(this)
                    }, 'retry remove teacher')
                else {
                    if (!data.response) 
                        VM.notify("Unable to delete teacher", "error")
                    else 
                        vm
                            .teachers
                            .remove(this)
                    }
            })
        }
    }

    function TeacherDetail(teacher) {
        let t = this,
            kontrolla,
            tips = ["Update classteacher status", "Assigned subjects"]
        if (!teacher) 
            return;
        
        // props
        t.me = teacher

        // observables
        t.allClasses = ko.observableArray()
        t.pos = ko.observable(1)
        t.assigning = ko.observable(false)

        // computed
        t.prevTooltip = ko.computed(() => {
            return t.pos() <= 1
                ? ''
                : tips[t.pos() - 2]
        })
        t.nxtTooltip = ko.computed(() => {
            return t.pos() >= tips.length
                ? ''
                : tips[t.pos()]
        })

        // behaviours
        t.back = () => kontrolla.position != 1
            ? t.prev()
            : controlla.prev()
        t.getClasses = () => {
            sockets.emit('get all classes', null, data => {
                if (data.status) {
                    if (data.response) {
                        t
                            .allClasses
                            .removeAll()
                        data
                            .response
                            .map(c => {
                                t
                                    .allClasses
                                    .push(new klass(c).$extend({$selected: false}))
                            })
                    }
                }
            }, true)
        }
        t.next = () => {
            kontrolla.next()
            t.pos(kontrolla.position)
            _tooltip()
        }
        t.prev = () => {
            kontrolla.prev()
            t.pos(kontrolla.position)
            _tooltip()
        }
        t.assignClass = (which, e, proceed = false) => {
            t
                .allClasses()
                .forEach(c => {
                    if (c != which) 
                        c.$selected(false)
                })
            if (!which.$selected()) 
                return which.$selected(true)
            else {
                if (e.target.nodeName != 'A') 
                    which.$selected(false)
                else {
                    if (!proceed && which.classteacher()) {
                        return VM.notify(`${which.code()} already has a classteacher '${vm.teachers().find(t => which.code() == t.assignedClass()).name()}' Do you want to proceed?`, 'warn', {
                            proceed: () => {
                                vm // deassign the existing classteacher
                                    .teachers()
                                    .find(t => which.code() == t.assignedClass())
                                    .assignedClass('')
                                t.assignClass(which, e, true) // assign the new guy
                            }
                        }, 'proceed with classteacher assign')
                    }
                    t.assigning(true)
                    sockets.emit('assign classteacher', {
                        who: t
                            .me
                            .email(),
                        which: which.code()
                    }, data => {
                        if (!data.status) 
                            VM.notify("Unable to assign classteacher, could not reach Control Workstation", "error")
                        else {
                            if (data.response) {
                                which.classteacher(t.me.email())
                                t
                                    .me
                                    .assignedClass(which.code())
                                VM.notify("Assigned as classteacher successfully")
                            } else 
                                VM.notify("There was a problem assigning classteacher, could not reach Control Workstation", "error")
                        }
                        t.assigning(false)
                    })
                }
            }
        }
        t.decommission = () => {
            t.assigning(true)
            sockets.emit('decommission classteacher', {
                who: t
                    .me
                    .email()
            }, data => {
                if (!data.status) 
                    VM.notify("Unable to decommission classteacher, could not reach Control Workstation", "error")
                else {
                    if (!data.response) 
                        VM.notify("Problem decommissioning classteacher")
                    else {
                        t
                            .allClasses()
                            .find(c => c.code() == t.me.assignedClass())
                            .classteacher('')
                        t
                            .me
                            .assignedClass('')
                        VM.notify("Classteacher decommissioned successfully")
                    }
                }
                t.assigning(false)
            })
        }

        // init
        _.defer(() => {
            t.getClasses()
            kontrolla = $('.sectionizr').sectionize()[1]
            _tooltip()
        })
    }

    // init
    _.defer(() => {
        controlla = $('.sectionizr').sectionize()
        vm.loadTeachers()
    })

}

new Component('teachers-screen')
    .def(vm)
    .load()