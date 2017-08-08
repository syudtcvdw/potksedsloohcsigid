const Student = maker('Student')
const vm = function (params) {
  let vm = this

  // props
  let controlla
  vm.info = "Click on a student to view and manage."

  // observables
  vm.students = ko.observableArray()
  vm.newStudent = ko.observable()
  vm.studentDetail = ko.observable()
  vm.newStudentActionName = ko.observable()

  // states
  vm.connected = ko.observable(false)
  vm.studentsFetchFailed = ko.observable(false)
  vm.loadingStudents = ko.observable(false)

  // behaviours
  vm.addStudent = () => {
    vm.newStudentActionName("Add New Student")
    vm.newStudent(new student)
    _tooltip()
  }
  vm.dismissAdd = () => {
    vm.newStudent(null)
    _tooltip()
  }
  vm.loadStudents = () => {
    vm.loadingStudents(true)
    sockets.emit('get all students', {
      class: VM.controlVm.teacherClass
    }, data => {
      vm.loadingStudents(false)
      if (!data.status) {
        vm.studentsFetchFailed(true)
        VM.notify("Unable to fetch students list, could not reach Control Workstation", "error", {
          'try again': vm.loadStudents
        }, 'retry load students')
      } else {
        vm.studentsFetchFailed(false)
        if (data.response) {
          vm
            .students
            .removeAll()
          data
            .response
            .map(s => {
              vm
                .students
                .push(new student(s))
            })
          vm.connected(true)
          _tooltip()
        }
      }
    }, true)
  }

  // sub-vm
  class student extends Student {
    constructor() {
      super(arguments)
    }

    // behaviours
    save() {
      if (_anyEmpty(this.surname(), this.firstname(), this.gender())) 
        return VM.notify("Do not leave any detail empty", "warn")

      let _student = this
        .keep('_id')
        .export()
      _student.class = VM.controlVm.teacherClass
      this.$saving(true)
      if (this._new) {
        // add
        _student.addDate = _student.addDate
          ? _student.addDate
          : _getUTCTime() / 1000 // to secs
        sockets.emit('add student', _student, (data) => {
          if (!data.status) 
            return this.$saving(false),
            VM.notify('Problem adding student, could not reach Control Workstation', 'error', {
              'try again': this
                .save
                .bind(this)
            }, 'retry add student')
          else {
            if (typeof data.response === 'object') {
              VM.notify('Student added successfully.')
              vm
                .students
                .push(new student(data.response))
              vm.addStudent()
            } else if (data.response === false) 
              VM.notify('Unable to add student', 'error')
            else 
              VM.notify(data.response, 'error')
            this.$saving(false)
          }
        })
      } else {
        // edit
        sockets.emit('edit student', _student, data => {
          if (!data.status) 
            return this.$saving(false),
            VM.notify('Problem editing student, could not reach Control Workstation', 'error', {
              'try again': this
                .save
                .bind(this)
            }, 'retry edit student')
          else {
            if (data.response) 
              VM.notify("Student updated successfully")
            else 
              VM.notify("Unable to update student")
            this.$saving(false)
          }
        })
      }
    }
    open() {}
    contextmenu(o, e) {
      VM
        .contextmenu
        .prep(e)
        .show({
          'Manage': this
            .open
            .bind(this),
          'Edit student': this
            .edit
            .bind(this),
          'Delete': this
            .remove
            .bind(this),
          'Refresh list': vm.loadStudents
        })
    }
    edit() {
      vm.newStudentActionName('Edit Student')
      vm.newStudent(this)
    }
    remove() {
      VM.notify('Are you sure you want to delete this student?', 'warn', {
        'yes': () => {
          sockets.emit('remove student', this._id, data => {
            if (!data.status) 
              VM.notify('Problem deleting student, could not reach Control Workstation', 'error', {
                'try again': this
                  .remove
                  .bind(this)
              }, 'retry remove student')
            else {
              if (!data.response) 
                VM.notify("Unable to delete student", "error")
              else 
                vm
                  .students
                  .remove(this)
              }
          }) // end emit
        }
      }) // end notify
    }
  }

  // init
  _.defer(() => {
    controlla = $('.sectionizr').sectionize()
    vm.loadStudents()
  })

}

new Component('classteacher-screen')
  .def(vm)
  .load()