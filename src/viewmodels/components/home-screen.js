const {Component} = require(__dirname + '/_compo_.js')
var exports = module.exports = {}

var component = {
    viewModel: function (params) {
        var vm = new Component('home-screen')
        var socket;
        var db;

        // observables
        vm.txt = ko.observable("Holla")
        
        // subscriptions
        VM.IP.subscribe((ip) => {
            vm.connect(ip)
        })

        // behaviours
        vm.connect = (ip) => {
            console.log('connecting to '+ip)
        }
        
        // init
        if (VM.MODE() == SERVER) {
            db = VM.db = require(__dirname + '/../../imports/_db.js')
            /*db.SchoolInfo.insert({name: "Test School"}, (err, newDoc) => {
                console.log(err)
                db.SchoolInfo.save(newDoc)
            })*/
            db.SchoolInfo.find({}, (err, docs) => {
                console.log(err)
                console.log(docs)
            })
        }console.log(vm)

        return vm
    },
    template: fs.readFileSync(TEMPLATES_PATH + 'home-screen.html', 'utf8')
}

exports = (() => {
    ko.components.register('home-screen', component)
})()
