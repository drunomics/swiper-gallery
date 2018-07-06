/**
 * @file
 * Defines Javascript behaviors for the swiper gallery module.
 */

(function ($, Drupal) {

  'use strict';

  /**
   * Attaches the swiper gallery.
   */
  Drupal.behaviors.swiperGallery = {
    attach: function (context, settings) {
      if (window.hasOwnProperty('SwiperGallery')) {
        window.SwiperGallery.galleryMobile.attach(context, settings.swiperGallery);
      }
    }
  };

})(jQuery, Drupal);
