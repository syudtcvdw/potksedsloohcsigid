var vm = function (params) {
    let vm = this
    let [DbSettings] = db("settings")

    // observables
    vm.appName = ko.observable("Digischools")
    vm.startPayload = ko.observable()

    // subscriptions
    vm
        .startPayload
        .subscribe(p => {
            _.delay(() => VM.loadView('start-screen', p), 1000)
        })

    // init
    _.defer(ajs)
    new Promise((resolve, reject) => {
        _.delay(() => {
            $('.splash-screen').addClass('dismiss')
            DbSettings
                .findOne({label: "runMode"})
                .execAsync()
                .then(doc => resolve(doc.value))
                .catch(err => reject())
        }, 5000)
    }).then(val => {
        // not first run
        console.log(`Val: ${val}`)
        vm.startPayload({mode: val})
    }).catch(err => {
        // first run
        vm.startPayload({})
    })
}

new Component('splash-screen')
    .def(vm)
    .load()