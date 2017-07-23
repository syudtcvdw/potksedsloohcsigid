const Exportable = require(CLASSES_PATH + 'Exportable')
/**
 * Represents a school class
 */
module.exports = class Klass extends Exportable {
    constructor(argv) {
        super()
        if (this.constructor == Klass) 
            throw TypeError("Klass is an abstract class, you cannot instantiate it")
        let args = argv.length > 0
            ? argv[0]
            : {}
        
        // props
        this._id = ko.observable(args._id || '')
        this.name = ko.observable(args.name || '')
        this.code = ko.observable(args.code || '')
        this.addDate = ko.observable(args.addDate || null)

        // states
        this.saving = ko.observable(false)

        // init
        this._new = !this._id()
    }
}