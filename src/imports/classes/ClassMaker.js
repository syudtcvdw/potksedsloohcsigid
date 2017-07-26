module.exports = function (...args) {
    let classes = []
    args.forEach(function (arg) {
        let $path = `${CLASSES_PATH + arg}.js`
        if (!fs.existsSync($path)) 
            throw TypeError(`Type '${arg}' does not exist`)
        if (arg != arg.toLowerCase()) 
            classes.push(require($path))
        else {
            let c = class dummyClass extends require($path) {
                constructor() {
                    super(arguments)
                }
                /**
                 * Use this to extend each new instance with properties
                 * Formatted object style as {propName: value}
                 * Each extended property is wrapped as an observable,
                 * and the prop name [is NO LONGER auto-prepended with a '$']
                 */
                $extend() {
                    if (arguments.length <= 0) 
                        return
                    let args = arguments[0]
                    for (let o in args) {
                        this[o] = typeof args[o] != 'function'
                            ? ko.observable(args[o])
                            : args[o].bind(this)
                    }
                    return this
                }
            }
            classes.push(c)
        }
    }, this);
    return classes.length == 1
        ? classes[0]
        : classes
}