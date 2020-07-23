# Dependencies for NPM

  

![Made For NPM](https://img.shields.io/badge/Made%20for-NPM-orange.svg)

 Instantiate all NPM packages into a single object and sanitise their names.
  

## Installation

```
npm i @marknotton/dependencies --save-dev
```

```js
const dependencies =  require('@marknotton/dependencies')();
```

## But why?
 

Code splitting tasks is ideal for maintaining your code in a coherent way, but in some cases it's useful to use the same instance of a node module without re-requested them within each task file. This is actually compulsory for things like Gulp, as it uses callbacks after each task completes which can loose it's scope if you attempt to redefine it more than once in multiple tasks.

This module will run through all the devDependencies from the package.json, sanitise their names, scope their vendors, and initialise them as getters.

*Please note that this tool is tailored specifically to my needs and may not be suitable for everyone. If you think this package should be expanded with additional options let me know.*

### How names are sanitised:  

Scoped packages (normally starting with '@') will be nested into their vendor name.

Packages with the same module name as their vendor will still be nested (`dependencies.rollup.rollup`)

All names will lose their 'gulp-', 'postcss-', 'plugin-', and 'rollup-' prefixes and will be camel cased.

Some modules may have their names aliased into something else ('lumberjack' to 'log'), this is defined bespokely in this file.

Reserved Javascript names will not be sanitised.  

### Usage

#### Old method:  

```js
const dotenv = require("dotenv"),
      @doggistyle = require("@doggistyle/library"),
      lumberjack = require("@marknotton/lumberjack"),
      notifier = require("@marknotton/notifier"),
      svgToSymbols = require("@marknotton/svg-to-symbols"),
      autoprefixer = require("autoprefixer"),
      browserSync = require("browser-sync"),
      gulp = require("gulp"),
      concat = require("gulp-concat"),
      gulpif = require("gulp-if"),
      plumber = require("gulp-plumber"),
      postcss = require("gulp-postcss"),
      rename = require("gulp-rename"),
      terser = require("gulp-terser"),
      postcssCustomProperties = require("postcss-custom-properties"),
      rollup = require("rollup"),
      rollupPluginCommonjs = require("@rollup/plugin-commonjs"),
      rollupPluginMultiEntry = require("@rollup/plugin-multi-entry"),
      rollupPluginNodeResolve = require("@rollup/plugin-node-resolve"),
      postcssAssets = require("postcss-assets"),
      snowpack = require("snowpack")
```


#### New method:  

```js
const dependencies = require('./gulp/dependencies')
  
const {
  doggistyle : { core, library },
  marknotton : { log, notifier, svgToSymbols },
  postcss : { customProperties, assets },
  rollup : { rollup, commonjs, multiEntry, nodeResolve },
  dotenv, browserSync, gulp, concat, if, plumber, rename, terser, snowpack
} = dependencies
```


**Remember this is not about syntactic sugar, this about retaining the scope of all the packages across all my tasks by only instantiating them once.**

### Aliases 

Some packages may need a bespoke reference to avoid conflicts or simply to sanitise the name to something that's easier to use. 'aliases' in your package.json

file should have the original name as the key, and the new desired name as the value.

It's possible to break the scoped vendor nesting by setting aliases if necessary. 

```json
"aliases": {
  "@marknotton/lumberjack": "log",
  "gulp-run-command": "run",
  "gulp-if": "gulpif",
  "vinyl-source-stream": "source",
  "@rollup/stream": "rollup",
  "@rollup/plugin-node-resolve": "@rollup/resolve",
  "@rollup/plugin-multi-entry": "@rollup/multi"
}
```

## Options

`log` `(Bool)` *( default: true )* - An output of all the package aliases and how to destructure the export will be logged. *Only works in 'dev' environments.* 

`scope` `(Bool)` *( default: true )* - Scoped vendors will be nested in the final export. If false, the export will be flattened but may cause naming conflicts.

`moduleHandler`  `(Function)`*(defaults : @see "[Request Module](https://github.com/marknotton/dependencies/blob/master/index.js)" in this modules index.js)* - Handle special changes to certain dependencies; like instantiating a modules sub-method with a custom settings. 

`nameTruncators`  `(Array)` *( default : ['gulp-', 'postcss-', 'plugin-', 'rollup-'] )* - Remove parts of the common vendor names to help sanitise the names how you'd like. You can completely edit the name using the "aliases" settings in your package.json or as another option *(see below)*. 

`aliases`  `(Object)` - This serves the same functionality as the aliases setting describe further up this page. Defining the aliases in in this option will prioritised over the package.json settings. 

```js
const dependencies =  require('@marknotton/dependencies')({ 
  scope : false, 
  log : false,
  moduleHandler : module => {
    if ( module == 'someModule' ) {
      return require(module).default({...})
    }
  },
  nameTruncators : [ 'webpack-' ],
  aliases : { "vinyl-source-stream": "source" }
});
```