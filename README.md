# Swiper Gallery

Swiper gallery is an integration of http://idangero.us/swiper/ for the 
media gallery.

## Setup

### Configuration 

To enable the gallery set a field formatter of a entity reference field of type
media to `Swiper gallery`.

The gallery comes with default image styles for the preview image, the slides
and the thumbnails. These can be changed in the field formatter options.

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
