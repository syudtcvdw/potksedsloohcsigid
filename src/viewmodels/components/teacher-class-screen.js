const vm = function (params) {
    let vm = this

    // props
    let controlla

    // states
    vm.connected = ko.observable(false)
    vm.loadingClasses = ko.observable(false)

    // behaviours
    vm.loadClasses = () => {
        vm.loadingClasses(true)
        sockets.emit('get teacher classes', { teacher: VM.controlVm.personEmail() }, data => {
            console.log(data)
        })
    }

    // init
    _.defer(() => {
        controlla = $('.sectionizr').sectionize()
        vm.loadClasses()
    })
}

new Component('teacher-class-screen')
    .def(vm)
    .load()