const VIEWMODELS_PATH = __dirname + '/viewmodels/'
const IMPORTS_PATH = __dirname + '/imports/'
const COMPONENTS_PATH = VIEWMODELS_PATH + 'components/'
const TEMPLATES_PATH = VIEWMODELS_PATH + 'templates/'
const SERVER = 'SERVER'
const CLIENT = 'CLIENT'

const fs = require('fs')
const ko = require('knockout')
const $ = require('jquery')
const _ = require('lodash')
const {ajs} = require(IMPORTS_PATH + 'ext/anim-js.min.js')
const {Component} = require(COMPONENTS_PATH + '_compo_.js')

function _random(min, max) {
    return Math.ceil(Math.random() * (max - min) + min);
}

/**
 * Useful in helping the faux-compiler determine if double quotes are escaped
 * @private
 * @param {object} data
 */
function _backslashCompliant(data) {
    for (let i in data) {
        let d = data[i].toString();
        let m = d.match(/"/gi);
        if (!m) continue;
        
        let p = d.match(/\\"/gi);
        if (!p) return false;
        if (m.length != p.length) return false;
    }
    return true;
}

/**
 * Wrapper for fetching template for specified component
 * @param {string} name 
 */
function _getComponentView(name) {
    return fs.readFileSync(TEMPLATES_PATH + name + '.html', 'utf8')
}

/**
 * Wrapper for loading a ko component
 * @param {string} name 
 * @param {object} component 
 */
function _loadComponent(name, component) {
    let _c = {
        viewModel: component,
        template: _getComponentView(name)
    }
    ko.components.register(name, _c)
}

/**
 * A depth-inclusive match extension for javascript string
 * @param   {RegExp} regex The regex pattern to match against
 * @returns {Array}  Array of (arrays) matches
 */
String.prototype.matches = function (regex) {
    let matches = [];
    let str = this.toString();
    while (str.length > 0) {
        let m = str.match(regex);
        if (!m) break;
        let ms = [];
        for (let i = 0; i < m.length; i++) ms.push(m[i]);
        str = str.substring(m.index + m[0].length);
        matches.push(ms);
    }
    return (matches);
}

/**
 * The sprintf String extension for javascript
 * @param   {Array|object} [replacement_map] The replacement map to use for the operation
 * @returns {string}       The string with values substituted
 */
String.prototype.sprintf = function (replacement_map) {
    replacement_map = replacement_map || {}; 
    let s = this.toString();
    let matches = s.matches(/#\{([^\{\}]*)\}/);
    matches.map((m, i) => {
        if (Array.isArray(replacement_map)) {
            if (replacement_map[i]) s = s.replace(m[0], replacement_map[i]);
        } else { 
            if (replacement_map[m[1]]) s = s.replace(m[0], replacement_map[m[1]]);
        }
    });
    return s;
}
