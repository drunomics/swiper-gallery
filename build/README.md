# Laravel Mix / Webpack 2 / Swiper Gallery
(c) drunomics GmbH, hello@drunomics.com

## External resources
* Laravel mix documentation: https://laravel.com/docs/5.4/mix
* Webpack 2 documentation: https://webpack.js.org/concepts/
* Twig documentation: https://twig.sensiolabs.org/doc/2.x/

## Overview

* Assets are built using webpack 2. Laravel mix is used as configuration base
  and provides us with a fluent API for further configuration of webpack.
* Components come with SCSS, Javascript (ES6) and twig files. Optionally they
  may contain and use further resources like images or fonts.
* The app (e.g. Drupal 8) can embed and leverage components directly via Twig.
* Dependencies are managed via npm only (no bower etc).
* Javascript is written in ES6 and uses ES6 modules; e.g. see 
  http://2ality.com/2014/09/es6-modules-final.html.

### Folders

* src: Contains all the source files, that are:
  * css: Contains sass which is not component-related, i.e. mixins and general
    config.
  * js: Contains the Javascript source files (ES6) which are not component
    related, i.e. usually just basic setup. As all JS, those files are
    transpiled with Babel.
  * components: Here is the interesting part - all frontend components. Those
    are split into:
    * base: Base-setup like colors, breakpoints and styling of elements.
    * site-elements: Contains various site elements.
    * content: Various content elements, its various display variants.
  
## Configuration overview
 
* package.json: Contains all dev-dependencies (for building) and front-end
  dependencies (CSS/SCSS, Javascript).
* The main config file is `webpack.mix.js` which configures webpack with the
  help of Laravel mix.

## Prerequisites / Setup

- Node 6.10.* (LTS boron) or later is required 
- Optional: Manage node versions using NVM
- Run `npm install` once.

### Using NVM (Node version manager)

See https://github.com/creationix/nvm

* Installation: 
  * Follow https://github.com/creationix/nvm#install-script
  * Then run:
```
   nvm install lts/boron
```
* Usage:
```
   # lts/boron is configured in .nvmrc
   nvm use  
   # Switch back to the default
   nvm use system
```

## Usage

* Compile assets
`npm run build`

* Compile assets (production mode)
`npm run production`

## Reset node installation 

```bash
rm -rf node_modules
npm cache clear --force
npm install
```
