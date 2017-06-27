var util = require('util')
var exports = module.exports = {}

exports.Component = function (name) {
    if (!name) 
        throw "Component must have a name"
    this._name = name
    this._defined = false
    let _vm = {}

    var _dispose = () => {
        console.log(`Disposing component ${_vm.____name || ''}`)
        ko
            .utils
            .arrayForEach(_vm, _disposeOne)
    }

    var _disposeOne = (propOrValue, value) => {
        var disposable = value || propOrValue;

        if (disposable && typeof disposable.dispose === "function") 
            disposable.dispose()
    }

    this.def = (options) => {
        if (!options) 
            throw "Please supply options (object)"
        if (typeof options === "function") {
            options.____name = this._name
            options.prototype.dispose = _dispose
            options.prototype.disposeOne = _disposeOne
            _vm = options
        } else {
            for (let o in options) 
                _vm[o] = options[o]
            _vm.dispose = _dispose
            _vm.disposeOne = _disposeOne
        }

        this._defined = true
        delete this.def
        return this
    }

    this.load = () => {
        if (!this._defined) 
            throw "Component not defined, call def() first, note that you can only call def() once"

            // delete unneeded properties
        delete this.build

        // build and load the ko component
        let _c = {
            viewModel: _vm,
            afterBind: function (componentInfo) {
                console.log(componentInfo)
            },
            template: _getComponentView(this._name)
        }
        ko
            .components
            .register(this._name, _c)
    }
}