const vm = function (params) {
  let vm = this

  // add new teacher
  vm.name = ko.observable()
  vm.phoneNo = ko.observable()
  vm.email = ko.observable()
  // edit teacher's info
  vm.updateName = ko.observable()
  vm.updatePhoneNo = ko.observable()

  // states
  vm.addingTeacher = ko.observable(false)
  vm.updatingTeacher = ko.observable(false)
  // behaviors
  /**
   * Adds a new teacher
   */
  vm.addTeacher = () => {
    if ( _anyEmpty(vm.name(), vm.phoneNo(), vm.email()) )
      return VM.notify('Fill in all teacher\'s credentials', 'warn')
  }
  /**
   * Edit teacher's record
   */
  vm.updateTeacher = () => {
    if ( _anyEmpty(vm.updateName(), vm.updatePhoneNo()) )
      return VM.notify('Please fill in all fields', 'warn')
  }
}

new Component('teachers-screen')
  .def(vm)
  .load()