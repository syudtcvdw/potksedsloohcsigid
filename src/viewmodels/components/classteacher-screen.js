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
  vm.loadingStudent = ko.observable(false)

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
    vm.studentsFetchFailed(false)
    vm.loadingStudent(false)
  }

  // sub-vm
  class student extends Student {
    constructor() {
      super(arguments)
    }

    // behaviours
    save() {
      if (_anyEmpty(this.surname(), this.lastname(), this.othername(), this.gender()))
        return VM.notify("Do not leave any detail empty", "warn")

      let _student = this.export()
      if (this._new) {
        // add
        this.$saving(true)
        _student.addDate = _student.addDate ? _student.addDate : _getUTCTime() / 1000 // to secs
      } else {
        // edit
        this.$saving(true)
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
    edit() {}
    remove() {}
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