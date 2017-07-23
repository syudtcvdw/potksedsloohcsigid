/**
 * Base class for Exportable classes
 * Exportable implies that public properties of the class can be exported as POJO
 */
module.exports = class Exportable {
    constructor() {
        if (this.constructor == Exportable) 
            throw TypeError("Exportable is an abstract class, you cannot instantiate it")
    }
    /**
     * Export this class as POJO, with only the public properties
     * And those not in the exclusions list
     * @param {Array} exclusions More properties to remove
     */
    export(...exclusions) {
        let o = ko.toJS(this)
        for (let prop in o)
            if (prop[0] == '_' || prop[0] == '$' || exclusions.indexOf(prop) != -1) 
                delete o[prop]
        return o
    }
}