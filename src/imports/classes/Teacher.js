const Exportable = require(CLASSES_PATH + 'Exportable')
/**
 * Represents a schoolteacher
 */
module.exports = class Teacher extends Exportable {
    constructor(argv) {
        super()
        if (this.constructor == Teacher) 
            throw TypeError("Teacher is an abstract class, you cannot instantiate it")
        let args = argv.length > 0
            ? argv[0]
            : {}

        // props
        this._id = ko.observable(args._id || '')
        this.name = ko.observable(args.name || '')
        this.email = ko.observable(args.email || '')
        this.phone = ko.observable(args.phone || '')
        this.password = ko.observable(args.password || '')
        this.gender = ko.observable(args.gender || '')
        this.addDate = ko.observable(args.addDate || null)
        this.$assignedClass = ko.observable(args.$assignedClass || false)

        // computed
        this.$assignmentInfo = ko.computed(() => {
            return this.$assignedClass()
                ? `Class teacher for ${this.$assignedClass()}`
                : 'Not a class teacher'
        })

        // states
        this.saving = ko.observable(false)

        // init
        this._new = !this._id()
    }
}