var vm = function (params) {
    let vm = this

    // props
    vm.serverDesc = "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Esse fuga officia magni veritatis fugit consectetur."
    vm.clientDesc = "Lorem ipsum dolor sit amet, consectetur adipisicing elit. Sapiente facere architecto qui. Totam, tenetur velit."

    // behaviours
    vm.serverMode = () => {
        VM.MODE("SERVER")
    }
    vm.clientMode = () => {
        VM.MODE("CLIENT")
    }

    // init
    _.defer(() => {
        $('.start-screen').append("<script src='./imports/ext/tooltip.min.js'></script>")
        tooltip.refresh()
    })
}

new Component('start-screen').def(vm).load()
