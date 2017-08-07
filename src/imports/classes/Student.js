const Exportable = require(CLASSES_PATH + 'Exportable')
module.exports = class Student extends Exportable {
  constructor(argv) {
    super()
    if (this.constructor == Student)
      throw TypeError("Student is an abstract class, you cannot instantiate it")
    let args = argv.length > 0 ?
      argv[0] :
      {}

    // props
    this._id = ko.observable(args._id || '')
    this.surname = ko.observable(args.surname || '')
    this.lastname = ko.observable(args.lastname || '')
    this.othername = ko.observable(args.othername || '')
    this.gender = ko.observable(args.gender || '')
    this.addDate = ko.observable(args.addDate || null)

    // states
    this.$saving = ko.observable(false)

    // init
    this._new = !this._id()
  }
}