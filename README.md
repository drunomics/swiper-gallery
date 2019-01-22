# Swiper Gallery

Swiper gallery is a custom integration of [Swiper](http://idangero.us/swiper/) 
for the media gallery.


## Table of content

 * [Swiper Gallery](#swiper-gallery)
   * [Table of content](#table-of-content)
   * [Introduction](#introduction)
     * [Features](#features)
     * [Limitations](#limitations)
     * [Browser support](#browser-support)
   * [Requirements](#requirements)
   * [Supported Modules](#supported-modules)
   * [Installation](#installation)
   * [Configuration](#configuration)
     * [Image viewmodes](#image-viewmodes)
     * [Gallery formatter](#gallery-formatter)
     * [Custom lazy loading icon](#custom-lazy-loading-icon)
     * [Ad entities as breakers](#ad-entities-as-breakers)
   * [Development / Contributing](#development--contributing)
     * [Demo](#demo)
   * [Maintainers](#maintainers)

## Introduction

This module provides a field formatter that allows a media gallery to be 
rendered in a preconfigured [Swiper](http://idangero.us/swiper/) gallery.

### Features

 * Desktop & mobile mode, automatically switches between the two.
 * Desktop mode: Looping horizontal slides with thumbnails for navigation.
 * Mobile mode: Vertical slides. 
 * Breaker blocks which are inserted after every x image.
 * Url navigation to slides & option to replace history for every slide.
 * Track page impressions for IVW and GTM if available.
 
### Limitations

 * No configuration of the swiper instance, all is preconfigured.
 * Gallery slides can not be used with responsive image styles.

### Browser support

| Browser            | from version |
|--------------------|-------------:|
| Android Browser    |            4 |
| Chrome             |           61 |
| Chrome for Android |           61 |
| Edge               |           15 |
| Firefox            |           57 |
| Internet Explorer  |           11 |
| Opera              |           49 |
| Safari             |        9+604 |
| Safari Mobile      |           11 | 
| Samsung Internet   |          5.2 |


## Requirements

 * [Media entity | Drupal.org](https://www.drupal.org/project/media_entity)


## Supported Modules

Page impression tracking is supported out of the box for the following modules:
 
 * [GoogleTagManager | Drupal.org](https://www.drupal.org/project/google_tag)
 * [IVW Integration | Drupal.org](https://www.drupal.org/project/ivw_integration) 

When the corresponding JS object is detected it will track an impression on
every slide.

Ad entities can be inserted via breaker block (see [Ad entities as breakers](#ad-entities-as-breakers)):

 * [Advertising Entity | Drupal.org](https://www.drupal.org/project/ad_entity)


## Installation

 * Install the module as you would normally install a contributed Drupal module.
   See [Installing Drupal 8 Modules](https://www.drupal.org/node/1897420) for further information.


## Configuration

To enable the gallery, the field formatter for a media gallery must be set to 
`Swiper gallery` ([Gallery formatter](#gallery-formatter)). 

Since the viewmodes of the slides & preview are also configurable, they should 
be set up first ([Image viewmodes](#image-viewmodes)).

It is important to use a separate image style for the gallery slides since it
is necessary to alter the image tags to be able to lazy load them with swiper.
This is done in a preprocess hook (see swiper_gallery_preprocess_image()).

The used image styles for the slides must then be added to the settings file.
To do so, copy the `/config/install/swiper_gallery.settings.yml` to Drupal's
config directory if it wasn't done so during the installation and add one or
more image styles to the `slide_image_styles` variable.

### Image viewmodes

Add and configure image viewmodes for the gallery:

 * Goto `/admin/structure/media/manage/image/display`
 * Setup viewmodes for:
   * The gallery itself (e.g.: `swiper gallery`)
   * The slides inside the gallery (`swiper gallery slide`)
   * The preview image for the media preview (`swiper gallery media preview`)
   * The preview image for the thumbs preview (`swiper gallery thumbs preview`)
   * The thumbnails in the thumbs preview (`swiper gallery thumbs preview thumb`) 
 * Create an image style for the gallery slides & set it in the slide viewmode

### Gallery formatter

Select & configure the `Swiper Gallery` field formatter: 

 * Goto `/admin/structure/media/manage/gallery/display`
 * Add & select the gallery viewmode (`swiper gallery`)
 * On `Media images` select the format `Swiper Gallery`
 * Open the field formatter settings & assign the viewmodes
 * Optionally configure other settings, like launcher text or breaker blocks

### Custom lazy loading icon

To set a custom loading icon, add the scss (or the css equivalent) in your 
theme like this, eg.:

```css
.gallery {
  .gallery-slide .swiper-lazy-preloader {
    animation: none;
    &:after {
      all: initial;
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      content: url('/assets/images/infinity-loader.gif');
      background: transparent;
    }
  }
}
```

### Ad entities as breakers

If you want to display an AdEntity on every x slide, you can configure the 
breaker to be an AdDisplay block. 

Since we had troubles with loading of ads you need to disable the initialization 
for the ad entities that are used in the breaker. The ads will be initialized by 
the gallery (see build/src/components/05-gallery/gallery-ads.js)

The reason for this is because of the looping functionality of swiper, which 
will generate duplicates of the slides and put them before and after the main 
slides. The ad entity module would initialize the first ad slide, which is a 
duplicate, but the visible ad slide would stay uninitialized.


## Development / Contributing

For development you can use the [Demo](#demo) as a starting point. You can setup 
a development environment which contains a full drupal installation within a 
docker container with test content & automated tests.

For how to build assets see build/README.md

### Demo

Try the gallery in a drupal demo installation within a docker container.
Visit https://github.com/drunomics/swiper-gallery-demo and follow the README. 


## Maintainers

 * Mathias (mbm80) - https://www.drupal.org/u/mbm80

Supporting organizations:
 
 * drunomics - https://www.drupal.org/drunomics
