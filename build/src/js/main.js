import "babel-polyfill";
import 'nodelist-foreach-polyfill';
import log from 'loglevel';

log.disableAll();
// Enable for debugging.
// log.enableAll();

import {Gallery, GalleryFsMobileScroll} from '../components/05-content/gallery/gallery';

window.SwiperGallery = {};
window.SwiperGallery.gallery = Gallery;
window.SwiperGallery.galleryMobile = GalleryFsMobileScroll;
