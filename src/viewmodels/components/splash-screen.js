var vm = function(params) {
    let vm = this
    vm.appName = ko.observable("Digischools")

    // init
    _.defer(ajs)
    new Promise((resolve, reject) => {
        _.delay(() => {
            $('.splash-screen').addClass('dismiss')
            resolve()
        }, 5000)
    }).then(() => {
        _.delay(() => VM.loadView('start-screen'), 1000)
    })
}

new Component('splash-screen').def(vm).load()