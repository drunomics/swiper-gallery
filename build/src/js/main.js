import 'idempotent-babel-polyfill';
import 'nodelist-foreach-polyfill';
import log from 'loglevel';
import cssVars from 'css-vars-ponyfill';

log.disableAll();
// Enable for debugging.
// log.enableAll();

cssVars({
  variables: {
    'mobile-breakpoint': '500px'
  }
})

import {Gallery, GalleryFsMobileScroll} from '../components/05-content/gallery/gallery';

window.SwiperGallery = {};
window.SwiperGallery.gallery = Gallery;
window.SwiperGallery.galleryMobile = GalleryFsMobileScroll;
