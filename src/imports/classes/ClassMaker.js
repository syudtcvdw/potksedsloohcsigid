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
            }
            classes.push(c)
        }
    }, this);
    return classes.length == 1
        ? classes[0]
        : classes
}