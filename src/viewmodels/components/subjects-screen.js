const vm = function (params) {
    let vm = this

    // props
    let controlla
    vm.info = "Click on a subject to view and manage it."

    // observables
    vm.subjects = ko.observableArray()
    vm.newSubject = ko.observable()
    vm.subjectDetail = ko.observable()
    vm.newSubjectActionName = ko.observable()

    // states
    vm.connected = ko.observable(false)
    vm.subjectsFetchFailed = ko.observable(false)
    vm.loadingSubjects = ko.observable(false)

    // behaviours
    vm.addSubject = () => {
        vm.newSubjectActionName("Add New Subject")
        vm.newSubject(new Subject)
        _tooltip()
    }
    vm.dismissAdd = () => {
        vm.newSubject(null)
        _tooltip()
    }
    vm.loadSubjects = () => {
        vm.subjectsFetchFailed(false)
        vm.loadingSubjects(true)
        sockets.emit('get all subjects', null, data => {
            vm.loadingSubjects(false)
            if (!data.status) {
                vm.subjectsFetchFailed(true)
                VM.notify("Unable to fetch subjects list, could not reach Control Workstation", "error", {
                    'try again': vm.loadSubjects
                }, 'retry load subjects')
            } else {
                vm.subjectsFetchFailed(false)
                if (data.response) {
                    vm
                        .subjects
                        .removeAll()
                    data
                        .response
                        .map(s => {
                            vm
                                .subjects
                                .push(new Subject(s))
                        })
                    vm.connected(true)
                    _tooltip()
                }
            }
        }, true)
    }

    // sub-vm
    function Subject() {
        let s = this
        let args = arguments.length > 0
            ? arguments[0]
            : {}

        // props
        s._id = ko.observable(args._id || '')
        s.title = ko.observable(args.title || '')
        s.code = ko.observable(args.code || '')
        s.addDate = ko.observable(args.addDate || null)

        // states
        s.saving = ko.observable(false)

        // behaviours
        s.save = () => {
            if (_anyEmpty(s.title(), s.code())) 
                return VM.notify("Do not leave any detail empty", "warn")

            let subject = ko.toJS(s)
            delete subject.saving // not needed

            if (_new) {
                // add
                s.saving(true)
                subject.addDate = subject.addDate
                    ? subject.addDate
                    : _getUTCTime() / 1000 // to secs
                delete subject._id
                sockets.emit('add subject', subject, data => {
                    if (!data.status) 
                        return s.saving(false),
                        VM.notify('Problem adding subject, could not reach Control Workstation', 'error', {
                            'try again': s.save
                        }, 'retry add subject')
                    else {
                        console.log(data)
                        if (typeof data.response == 'object') {
                            VM.notify('Subject added successfully.')
                            vm
                                .subjects
                                .push(new Subject(data.response))
                            vm.addSubject()
                        } else if (data.response === false) 
                            VM.notify('Unable to add subject', 'error')
                        else 
                            VM.notify(data.response, 'error')
                        s.saving(false)
                    }
                })
            } else {
                // edit
                s.saving(true)
                sockets.emit('edit subject', subject, data => {
                    if (!data.status) 
                        return s.saving(false),
                        VM.notify('Problem editing subject, could not reach Control Workstation', 'error', {
                            'try again': s.save
                        }, 'retry edit subject')
                    else {
                        if (data.response) 
                            VM.notify("Subject updated successfully")
                        else 
                            VM.notify("Unable to update subject")
                        s.saving(false)
                    }
                })
            }
        }
        s.open = () => {
            vm.subjectDetail(new SubjectDetail(s))
            controlla.next()
        }
        s.contextmenu = (o, e) => {
            VM
                .contextmenu
                .prep(e)
                .show({
                    'Manage': s.open,
                    'Edit subject': () => {
                        vm.newSubjectActionName('Edit Subject')
                        vm.newSubject(s)
                    },
                    'Delete': () => {}, // replace callback here with delete behaviour
                    'Refresh list': vm.loadSubjects
                })
        }

        // init
        let _new = !s._id()
    }

    function SubjectDetail(subject) {
        let s = this
        if (!subject) 
            return;
        
        // props
        s.me = subject
        // behaviours
        s.back = () => controlla.prev()
    }

    // init
    _.defer(() => {
        controlla = $('.sectionizr').sectionize()
        vm.loadSubjects()
    })

}

new Component('subjects-screen')
    .def(vm)
    .load()