var exports = module.exports = {}

var component = {
    viewModel: function (params) {
        var vm = this; 
        
        // observables
        vm.mode = ko.observable()
        
        // behaviours
        vm.serverMode = () => {
            VM.MODE("SERVER")
        }
        vm.clientMode = () => {
            VM.MODE("CLIENT")
        }
    },
    template: fs.readFileSync(TEMPLATES_PATH + 'start-screen.html', 'utf8')
}

exports = (() => {
    ko.components.register('start-screen', component)
})()
