var vm = function (params) {
    let vm = this

    // observables
    vm.logo = ko.observable()

    // init
    fs.exists(USERDATA_ASSETS_PATH + 'logo.jpg', b => { // load logo
        vm.logo(`url('${b? logoUri = USERDATA_ASSETS_PATH + 'logo.jpg':DEFAULT_SCHOOL_LOGO}?q${_random()}')`)
        console.log(vm.logo())
    })
}

new Component('home-screen')
    .def(vm)
    .load()