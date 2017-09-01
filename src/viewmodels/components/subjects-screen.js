const Subject = maker('Subject')
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
    vm.newSubject(new subject)
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
                .push(new subject(s))
            })
          vm.connected(true)
          _tooltip()
        }
      }
    }, true)
  }

  // sub-vm
  class subject extends Subject {
    constructor() {
      super(arguments)
    }

    // behaviours
    save() {
      if (_anyEmpty(this.title(), this.code())) 
        return VM.notify("Do not leave any detail empty", "warn")

      let _subject = this
        .keep('_id')
        .export()
      this.$saving(true)
      if (this._new) {
        // add
        _subject.addDate = _subject.addDate
          ? _subject.addDate
          : _getUTCTime() / 1000 // to secs

        delete _subject._id
        sockets.emit('add subject', _subject, data => {
          if (!data.status) 
            return this.$saving(false),
            VM.notify('Problem adding subject, could not reach Control Workstation', 'error', {
              'try again': this
                .save
                .bind(this)
            }, 'retry add subject')
          else {
            if (typeof data.response == 'object') {
              VM.notify('Subject added successfully.')
              vm
                .subjects
                .push(new subject(data.response))
              vm.addSubject()
            } else if (data.response === false) 
              VM.notify('Unable to add subject', 'error')
            else 
              VM.notify(data.response, 'error')
            this.$saving(false)
          }
        })
      } else {
        // edit
        sockets.emit('edit subject', _subject, data => {
          if (!data.status) 
            return this.$saving(false),
            VM.notify('Problem editing subject, could not reach Control Workstation', 'error', {
              'try again': this
                .save
                .bind(this)
            }, 'retry edit subject')
          else {
            if (data.response) 
              VM.notify("Subject updated successfully")
            else 
              VM.notify("Unable to update subject")
            this.$saving(false)
          }
        })
      }
    }
    open() {
      vm.subjectDetail(new SubjectDetail(this))
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
          'Edit subject': this
            .edit
            .bind(this),
          'Delete': this
            .remove
            .bind(this),
          'Refresh list': vm.loadSubjects
        })
    }
    edit() {
      vm.newSubjectActionName('Edit Subject')
      vm.newSubject(this)
    }
    remove() {
      VM.notify('Are you sure you want to delete this subject?', 'warn', {
        'yes': () => {
          sockets.emit('remove subject', this.code(), data => {
            if (!data.status) 
              VM.notify('Problem deleting subject, could not reach Control Workstation', 'error', {
                'try again': this
                  .remove
                  .bind(this)
              }, 'retry remove subject')
            else {
              if (!data.response) 
                VM.notify("Unable to delete subject", "error")
              else 
                vm
                  .subjects
                  .remove(this)
              }
          }) // end emit
        }
      }) // end notify
    }
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