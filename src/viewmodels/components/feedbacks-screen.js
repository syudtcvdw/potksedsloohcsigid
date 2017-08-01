const vm = function (params) {
  let vm = this

  // observables
  vm.fbTitle = ko.observable()
  vm.fbMsg = ko.observable()

  // states
  vm.sending = ko.observable(false)

  // behaviours
  vm.sendFeedback = () => {
    if (_anyEmpty(vm.fbTitle(), vm.fbMsg())) 
      return VM.notify('All fields are required', 'warn')
    new Promise((resolve, reject) => {
      vm.sending(true)
      let postData = {
        school_id: VM
          .controlVM
          .schoolUid(),
        title: vm.fbTitle(),
        message: vm.fbMsg()
      }
      api
        .p('admin/feedback', postData)
        .then(data => resolve(data))
        .catch(err => reject(err))
    }).then(d => {
      if (!d.data.status) 
        VM.notify(d.data.msg, 'err')
      else {
        VM.notify('Successfully sent!')
        vm.sending(false)
      }
    }).catch(err => {
      VM.notify("Problem sending feedback, could not reach Control Workstation", 'error', {'try again': () => {
        vm.sendFeedback()
      }})
      vm.sending(false)
    })

  } // end sendFeedback

}

new Component('feedbacks-screen')
  .def(vm)
  .load()