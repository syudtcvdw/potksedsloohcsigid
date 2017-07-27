const [Klass,
    teacher,
    subject] = maker('Klass', 'teacher', 'subject')
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
                            'try again': this
                                .save
                                .bind(this)
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
                            'try again': this
                                .save
                                .bind(this)
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
                .show({
                    'Manage': this
                        .open
                        .bind(this),
                    'Edit class': this
                        .edit
                        .bind(this),
                    'Delete': this
                        .delete
                        .bind(this),
                    'Refresh list': vm.loadClasses
                })
        }
        edit() {
            vm.newClassActionName('Edit Class')
            vm.newClass(this)
        }
        delete() {
            sockets.emit('remove class', this.code(), data => {
                if (!data.status) 
                    VM.notify('Problem removing class, could not reach Control Workstation', 'error', {
                        'try again': this
                            .delete
                            .bind(this)
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
        c.roster = {}
        c.subjects = [
            ko.observableArray(),
            ko.observableArray()
        ]

        // observables
        c.selectedSubject = ko.observable()
        c.teachers = ko.observableArray()
        c.selectedSubjectHasTeacher = ko.observable()
        c.assigning = ko.observable(false)

        // subscriptions
        c
            .selectedSubject
            .subscribe(s => {
                if (!s) 
                    return
                let hasTeacher = false;
                c
                    .teachers()
                    .map(t => {
                        t.$selected(false)
                        t.$attached(false)
                        if (typeof c.roster[s.code()] != 'undefined' && c.roster[s.code()] == t.email()) {
                            t.$attached(true)
                            hasTeacher = true
                        }
                    })
                c.selectedSubjectHasTeacher(hasTeacher)
            })

        // behaviours
        c.back = () => kontrolla.position > 1
            ? c.backToSubjects()
            : controlla.prev()
        c.loadSubjects = () => {
            sockets.emit('get all subjects', c.me.code(), data => { // send in the class code so we get subjects with their subject teachers
                if (data.status) {
                    if (data.response) {
                        console.log(data.response)
                        c
                            .subjects
                            .forEach(s => {
                                s.removeAll()
                            });
                        data
                            .response
                            .map(s => {
                                if (typeof c.roster[s.code] == 'undefined') 
                                    c.subjects[1].push(new subject(s).$extend({$taught: false}))
                                else 
                                    c
                                        .subjects[0]
                                        .push(new subject(s).$extend({$taught: true}))
                                })
                    } else 
                        VM.notify("Unable to fetch subjects list", "error")
                } else 
                    VM.notify("Unable to fetch subjects list", "error")
            }, true)
        }
        c.loadTeachers = () => {
            sockets.emit('get all teachers', null, data => {
                if (data.status) {
                    if (data.response) {
                        c
                            .teachers
                            .removeAll()
                        data
                            .response
                            .map(t => {
                                c
                                    .teachers
                                    .push(new teacher(t).$extend({$selected: false, $attached: false}))
                            })
                    } else 
                        VM.notify("Unable to fetch teachers list", "error")
                } else 
                    VM.notify("Unable to fetch teachers list", "error")
            }, true)
        }
        c.openSubject = (o, e) => {
            c.selectedSubject(o)
            kontrolla.next()
        }
        c.assignTeacher = (which, e, proceed = false) => {
            c
                .teachers()
                .forEach(t => {
                    if (t != which) 
                        t.$selected(false)
                })
            if (!which.$selected()) 
                return which.$selected(true)
            else {
                if (e.target.nodeName != 'A') 
                    which.$selected(false)
                else {
                    c.assigning(true)
                    sockets.emit('assign teacher to subject', {
                        teacher: which.email(),
                        subject: c
                            .selectedSubject()
                            .code(),
                        class: c
                            .me
                            .code()
                    }, data => {
                        if (!data.status) 
                            VM.notify("Unable to assign teacher, could not reach Control Workstation", "error")
                        else {
                            if (!data.response) 
                                VM.notify(`Problem assigning teacher for ${c.selectedSubject().code()} in this class`, "error")
                            else {
                                c.roster[
                                    c
                                        .selectedSubject()
                                        .code()
                                ] = which.email()
                                c
                                    .subjects[1]
                                    .remove(c.selectedSubject())
                                c
                                    .subjects[0]
                                    .push(c.selectedSubject())
                                kontrolla.prev()
                                VM.notify("Teacher assigned to teach subject successfully")
                            }
                        }
                        c.assigning(false)
                    })
                }
            }
        }
        c.backToSubjects = () => {
            VM.closeNotification('load roster')
            kontrolla.prev()
            c.selectedSubject(null)
        }
        c.loadRoster = () => {
            sockets.emit('get roster', c.me.code(), data => {
                if (data.status) {
                    if (data.response) {
                        c.roster = data.response
                        c.loadTeachers()
                        c.loadSubjects()
                    } else 
                        VM.notify("Unable to fetch teaching roster", "error")
                } else 
                    VM.notify("Unable to fetch teaching roster", "error", {
                        'try again': c.loadRoster
                    }, 'load roster')
            }, true)
        }
        c.subjectCtx = (o, e) => {
            let menu = {
                'Manage': () => c.openSubject(o, e)
            }
            if (o.$taught()) 
                _.extend(menu, {
                    'Remove subject': () => {
                        c.assigning(true)
                        sockets.emit('remove subject from roster', {
                            class: c
                                .me
                                .code(),
                            subject: o.code()
                        }, data => {
                            if (!data.status) 
                                VM.notify("Unable to remove subject from class, could not reach Control Workstation", "error")
                            else {
                                if (!data.response) 
                                    VM.notify("Unable to remove subject from class", "error")
                                else {
                                    delete c.roster[o.code()]
                                    c
                                        .subjects[0]
                                        .remove(o)
                                    c
                                        .subjects[1]
                                        .push(o)
                                    VM.notify("Subject removed from class successfully")
                                }
                            }
                            c.assigning(false)
                        })
                    }
                });
            VM
                .contextmenu
                .prep(e)
                .show(menu)
        }
        c.expandTaughtSubject = (o) => {
            console.log(o)
        }

        // init
        _.defer(() => {
            c.loadRoster()
            kontrolla = $('.sectionizr').sectionize()[1]
        })
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