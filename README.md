Swiper Gallery
==============

Swiper gallery is an integration of http://idangero.us/swiper/ for the 
media gallery.

## Setup

### Configuration 

To enable the gallery set a field formatter of a entity reference field of type
media to `Swiper gallery`. 

Step 1: Add and configure media viewmodes for the gallery

Setup viewmodes for:

* The gallery itself (e.g.: `swiper gallery`)
* The slides inside the gallery (`swiper gallery slide`)
* The preview image for the media preview (`swiper gallery media preview`)
* The preview image for the thumbs preview (`swiper gallery thumbs preview`)
* The thumbnails in the thumbs preview (`swiper gallery thumbs preview thumb`) 

Step 2: Select & configure the `Swiper Gallery` field formatter 

* Goto `/admin/structure/media/manage/gallery/display`
* Add & select the gallery viewmode (`swiper gallery`)
* On `Media images` select the format `Swiper Gallery`
* Open the field formatter settings & assign the viewmodes
* Optionally configure other settings, like launcher text or breaker blocks

### Override lazy loading icon

To set a custom loading icon, set the scss (or the css equivalent) in your 
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
