var vm = function (params) {
    let vm = this

    // observables
    vm.uiVisible = ko.observable(false)
    vm.logo = ko.observable()

    // init
    _.defer(() => {
        // get logo
        fs.exists(USERDATA_ASSETS_PATH + 'logo.jpg', b => { // load logo
            vm.logo(`url('${b
                ? logoUri = USERDATA_ASSETS_PATH + 'logo.jpg'
                : DEFAULT_SCHOOL_LOGO}?nonce=${VM.nonce}')`)
            vm.uiVisible(true)
        })
        
        // match heights
        setTimeout("$('.text-block').matchHeight({})", 200)
    })
}

new Component('home-screen')
    .def(vm)
    .load()