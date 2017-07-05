var util = require('util')
var exports = module.exports = {}

exports.Component = function (name) {
    if (!name) 
        throw "Component must have a name"
    this._name = name
    this._defined = false
    let _vm = {}

    this.def = (options) => {
        if (!options) 
            throw "Please supply options (object)"
        if (typeof options === "function") {
            _vm = options
            ko
                .utils
                .extend(_vm.prototype, {
                    ___name: this._name,
                    dispose: function () {
                        console.log(`Disposing ${this.___name} component`)
                        ko.utils.objectForEach(this, this.disposeOne);
                        for (let p in this) this[p] = null
                    },

                    // little helper that handles being given a value or prop + value
                    disposeOne: function (propOrValue, value) {
                        var disposable = value || propOrValue;
                        
                        if (disposable && typeof disposable.dispose === "function") {
                            console.log(`Disposing ...`)
                            disposable.dispose();
                        }
                    }
                })
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