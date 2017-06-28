const {SchoolInfo} = require(IMPORTS_PATH + '_db.js')

var vm = function (params) {
    let vm = this

    // props
    vm.serverDesc = "Choose this option if this is the only workstation Digischools is running on in your institution, or if this is the control station for Digischools. If you have multiple deployments of Digischools on several workstations, all workstations need to be connected to the same network in order to communicate and share information back & forth."
    vm.clientDesc = "Choose this option if there is another control workstation Digischools is running on in your institution. This workstation needs to be connected to the same network with the control workstation in order to communicate and share information back & forth."

    // observables
    vm.mode = ko.observable()
    vm.logonEmail = ko.observable()
    vm.logonPwd = ko.observable()
    vm.logonErr = ko.observable()
    vm.serverIp = ko.observable()
    vm.loading = ko.observable(false)

    // behaviours
    vm.serverMode = () => {
        vm.mode(SERVER)
    }
    vm.clientMode = () => {
        vm.mode(CLIENT)
    }
    vm.dismissLogon = () => {
        vm.mode(null)
        _.defer(() => (ajs(),tooltip.refresh())) // rebind anim-js and tooltips
    }
    vm.start = () => {
        new Promise((resolve, reject) => {
            vm.loading(true)
            setTimeout(() => reject("Operation interrupted promisically"), 3000)
        }).then().catch((s) => { vm.logonErr(s) })
    }
    vm.dismissLoading = () => {
        vm.logonErr(null)
        vm.loading(false)
    }

    // subscriptions
    vm.mode.subscribe(() => $('#tooltip').remove())

    // init
    _.defer(() => {
        ajs()
        $('.start-screen').append("<script src='./imports/ext/tooltip.min.js'></script>")
        tooltip.refresh()
    })
}

new Component('start-screen').def(vm).load()
