const Exportable = require(CLASSES_PATH + 'Exportable')
module.exports = class Subject extends Exportable {
    constructor(argv) {
        super()
        if (this.constructor == Subject) 
            throw TypeError("Subject is an abstract class, you cannot instantiate it")
        let args = argv.length > 0
            ? argv[0]
            : {}

        // props
        this._id = ko.observable(args._id || '')
        this.title = ko.observable(args.title || '')
        this.code = ko.observable(args.code || '')
        this.addDate = ko.observable(args.addDate || null)

        // states
        this.saving = ko.observable(false)

        // init
        this._new = !this._id()
    }
}