import 'idempotent-babel-polyfill';
import 'nodelist-foreach-polyfill';
import log from 'loglevel';

log.disableAll();
// Enable for debugging.
// log.enableAll();

import {GalleryFsMobileScroll} from '../components/05-gallery/gallery-fs-mobile-scroll';

window.SwiperGallery = {};
window.SwiperGallery.galleryMobile = GalleryFsMobileScroll;
