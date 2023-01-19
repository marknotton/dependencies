////////////////////////////////////////////////////////////////////////////////
// Node Dependencies 
////////////////////////////////////////////////////////////////////////////////

'use strict';

// If this is true an output of all the package alias and how to destructure 
// the export will be shown
let showLog = true

// If this is true, scoped vendors will be nested in the final export. 
// If false, the export will be flattened but may cause naming conflicts.
let scopeVendors = true

// Loads environment variables from a .env file into process.env.
require('dotenv').config()

const log = require('@marknotton/lumberjack')

const { name, aliases, devDependencies } = require(process.cwd() + '/package.json')

let _modules = {}
let _vendors = []
let _beforeAndAfterLogs = []
let _nameTruncators = ['gulp-', 'postcss-', 'plugin-', 'rollup-']
let _customAliases = false
let _moduleHandler = false

// Add the project name as a process.env global constant and title case it.
process.env.PROJECT = (() => {
  return name ? name.replace('-', ' ') : 'Project'; 
})().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

function init() {

  if ( devDependencies && Object.keys(devDependencies).length ) {
    
    //  Use custom aliases over any package.ons aliases
    _customAliases = _customAliases ? _customAliases : (aliases || [])

    if (!_customAliases || _customAliases && !_customAliases.hasOwnProperty('path')) { _customAliases['path'] = 'Path' }
    if (!_customAliases || _customAliases && !_customAliases.hasOwnProperty('stream')) { _customAliases['stream'] = 'Stream' }
    if (!_customAliases || _customAliases && !_customAliases.hasOwnProperty('@marknotton/lumberjack')) { _customAliases['@marknotton/lumberjack'] = 'log' }

    // Remove this module. It doesn't need to be used any further after it's innitial instantiation
    if (devDependencies.hasOwnProperty('@marknotton/dependencies')) { delete devDependencies['@marknotton/dependencies'] }
    
    // Adds a few native Node API's that are commonly used
    if (!devDependencies.hasOwnProperty('path'))   { devDependencies['path']   = '' }
    if (!devDependencies.hasOwnProperty('stream')) { devDependencies['stream'] = '' }
    if (!devDependencies.hasOwnProperty('fs'))     { devDependencies['fs'] = '' }
    if (!devDependencies.hasOwnProperty('@marknotton/lumberjack')) { devDependencies['@marknotton/lumberjack'] = '' }
    
    // Run through all the depenencies from the package.json relative to this folder
    // and render each package into a modules object
    Object.keys(devDependencies).forEach((module) => {

      // Clone the name so that we can modify
      let name = module
      
      // Check if there were any preferences to alias modules
      name = _customAliases && _customAliases.hasOwnProperty(name) ? _customAliases[name] : name

      // Check if this module has any special rules that justifty nesting it into 
      // a nested item in the modules oject. The vendor name helps retain scope.

      if ( scopeVendors  ) {
        var vendor = (() => {
          if ( name.includes('/') ) {
            return name.split(/[\/ ]+/)[0].replace('@', '')
          } else if ( name.includes('postcss-') || name == 'autoprefixer') {
            return 'postcss'
          } else if ( name.includes('rollup')  ) {
            return 'rollup'
          }
        })()

        if ( vendor && !_modules.hasOwnProperty(vendor)) { 
          _modules[vendor] = []
          _vendors.push(vendor)
        }
      }

      // Split the name delimited by any forward slasses and return the last item.
      name = name.split(/[\/ ]+/).pop()

      // Remove common prefixes
      _nameTruncators.forEach(modifier => {
        name = name.replace(modifier, '')
      })

      // Javascript reserved words can't be used as a reference and will be
      // prefixed with 'gulp-'
      if ((/\b(abstract|arguments|await|boolean|break|byte|case|catch|char|class|const|continue|debugger|default|delete|do|double|else|enum|eval|export|extends|false|final|finally|float|for|function|goto|if|implements|import|in|instanceof|int|interface|let|long|native|new|null|package|private|protected|public|return|short|static|super|switch|synchronized|this|throw|throws|transient|true|try|typeof|var|void|volatile|while|with|yield)\b/g.test(name))) {
        name = module
      } 

      // Camelcase the name
      name = name.replace(/-(\w)/g, (m, part) => part.toUpperCase())

      // Define the package into the plugin object as a getter
      let reference = scopeVendors && vendor ? _modules[vendor] : _modules

      _beforeAndAfterLogs.push([module, '=>', (scopeVendors && vendor ? `${vendor}.${name}` : name), ['green', '#11A8CD', 'yellow'], false, false])

      Object.defineProperty(reference, name, {
        enumerable: true,
        get: () => requestModule(module)
      })
    })

    if ( showLog && process.env.ENVIRONMENT == 'dev' ) {
      renderBeforeAndAfter()
      renderUsageOutput()
    }
  }

  return _modules

}
// Request Module ==============================================================
// There may be special circomstances where you want to instantiate a specific 
// method inside a module. This function gives you that added control

function requestModule(module) {

  if ( _moduleHandler ) {
    let customHandler = _moduleHandler(module)
    if ( typeof customHandler !== 'undefined' ) {
      return customHandler
    }
  }

  switch (module) {
    case 'browser-sync':
      return require(module).create()
    break;
    case 'gulp-run-command':
      return require(module).default
    break;
    case 'rollup':
      return require(module).rollup
    break;
    case 'rollup-plugin-terser':
      return require(module).terser
    break;
    case '@rollup/plugin-node-resolve':
      return require(module).nodeResolve
    break;
    case 'dotenv':
      return require(module).config()
    break;
    case 'minimatch':
      return require(module).Minimatch || require(module)
    break;
    case 'postcss-assets':
      const { paths } = require('../config.json')
      return require(module)({loadPaths:[paths.images]})
    break;
    default:
      return require(module)
  }
}

// Render Before and After =====================================================
// Log a list of all the packages that were requested and their alaises.

function renderBeforeAndAfter() {
  if ( _beforeAndAfterLogs.length ) {
    
    log(`${Object.values(devDependencies).length} packages have been loaded and will be exported from this module.`, ['yellow'], false, false)
    log(`Their original references have been sanatised to the following aliases:`, ['yellow'], false, false)
    log("==============================================================================", ['#464A50'], false, false)

    _beforeAndAfterLogs.forEach(message => log(...message))
  } else {
    log('No packages were loaded. Check your packages.json files for devDependencies', [red])
  }
}

// Render Usage Output =========================================================
// Log an example of how to destructure all the packages 

function renderUsageOutput() {
  
  log("==============================================================================", ['#464A50'], false, false)
  log('You can destructure all your dependencies using the following syntax:', ['yellow'], false, false)
  log("==============================================================================", ['#464A50'], false, false)
  
  let output = `const {`;

  if ( scopeVendors ) {
    for (const vendor of Object.values(_vendors)) {
      output = `${output}
    ${vendor} : { ${Object.keys(_modules[vendor]).join(', ')} },`
    }
  }
  
  output = `  ${output} 
    ${Object.keys(_modules).filter(vendor => !_vendors.includes(vendor)).join(', ') }
  } = require('@marknotton/dependencies')()`

  log(output, ['#11A8CD'], false, false)
  log("==============================================================================", ['#464A50'], false, false)
  log("It's recommended that you only extract what you need, not everything.", ['yellow'], false, false)

} 

module.exports = (options) => {
  if ( options ) {
    if ( options.hasOwnProperty('log') ) {
      showLog = options.log
    }
    if ( options.hasOwnProperty('scope') ) {
      scopeVendors = options.scope
    }
    if ( options.hasOwnProperty('moduleHandler') ) {
      _moduleHandler = options.moduleHandler
    }
    if ( options.hasOwnProperty('nameTruncators') ) {
      _nameTruncators = options.nameTruncators
    }
    if ( options.hasOwnProperty('aliases') ) {
      _customAliases = options.aliases
    }
  }
  return init()
}
