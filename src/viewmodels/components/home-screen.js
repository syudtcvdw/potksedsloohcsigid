var exports = module.exports = {}

var component = {
    viewModel: function (params) {
        var vm = this;
        var socket;
        var db;

        // observables
        vm.lastRun = ko.observable()
        
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
            db = VM.db = require(__dirname + '/../../imports/db.js')
            /*db.SchoolInfo.insert({name: "Test School"}, (err, newDoc) => {
                console.log(err)
                db.SchoolInfo.save(newDoc)
            })*/
            db.SchoolInfo.find({}, (err, docs) => {
                console.log(err)
                console.log(docs)
            })
        }
    },
    template: fs.readFileSync(TEMPLATES_PATH + 'home-screen.html', 'utf8')
}

exports = (() => {
    ko.components.register('home-screen', component)
})()
