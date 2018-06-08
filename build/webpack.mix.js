const { mix } = require('laravel-mix');
const browser_support = ['last 2 versions', 'IE >= 10', 'Safari >= 8'];

/**
 * Assets are handled with laravel mix. See https://laravel.com/docs/5.4/mix.
 */

mix.js('src/js/main.js', '.')
  .sass('src/css/main.scss', '.')
  .setPublicPath('assets')
  .setResourceRoot('./');
// @todo Find a way to properly enable source maps. Scripts with source maps
//   are excluded in Drupal when aggregation is enabled.
//   @see \Drupal\Core\Asset\JsOptimizer::clean()
//.sourceMaps();

mix.options({
  extractVueStyles: false,
  processCssUrls: true,
  uglify: {},
  purifyCss: false,
  postCss: [require('autoprefixer')( { browsers: browser_support})],
  clearConsole: false
});

// Prevent default laravel config to require jQuery,
// as this library will be already provided by Drupal.
mix.autoload({});

var webpack_extra_config = {
  module: {
    rules: [
      // Add support for sass import globbing.
      {
        test: /\.scss/,
        enforce: "pre",
        loader: "import-glob-loader"
      }
    ]
  },
  plugins: []
};

mix.webpackConfig(webpack_extra_config);
