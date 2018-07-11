import log from 'loglevel';

/**
 * Ad handler for the gallery.
 */
class GalleryAds {

  /**
   * Initialize swiper instance.
   *
   * @param {Object} swiper
   *   The swiper instance.
   */
  init(swiper) {
    if (typeof(Drupal.ad_entity) === "undefined") {
      return;
    }

    this.swiper = swiper;
    this.initializeAllAds();
  }

  /**
   * Get slides with an ad.
   *
   * @returns {Array}
   *   Slides containing an ad.
   */
  getAdSlides() {
    let ad_slides = [];
    [].forEach.call(this.swiper.slides, function(slide) {
      let ad_container = slide.querySelectorAll('.ad-entity-container');
      if (ad_container.length > 0) {
        ad_slides.push(slide);
      }
    });

    return ad_slides;
  }

  /**
   * Initialize all ads in the gallery.
   */
  initializeAllAds() {
    this.getAdSlides().forEach(function(ad_slide) {
      GalleryAds.initializeAd(ad_slide);
    });
  }

  /**
   * Initialize ads on a specific slide.
   *
   * This will rewrite the ad-entity container id, as well as its sub-div id
   * to make sure we initialize with a unique id, so to not mess up the loading.
   *
   * @param {Object} ad_slide
   *   A slide containing an ad.
   */
  static initializeAd(ad_slide) {
    let ad = ad_slide.querySelector('.ad-entity-container');

    log.info('initializeAd');
    log.info(ad);

    if (!ad.classList.contains('initialization-disabled')) {
      log.info('-- skip initialized');
      return;
    }

    let id = ad.id;
    let postfix = Math.random().toString(36).substr(2, 3);

    // Fix id.
    ad.id = id + '_' + postfix;
    // The sub element must have a unique id as well.
    let sub_div = ad.querySelector('div');
    sub_div.id = sub_div.id + '_' + postfix;

    // Allow initialization.
    ad.classList.remove('initialization-disabled');
    // After sliding through the gallery, more duplicates of initialized
    // ads will be created, so we have to remove this class as well.
    ad.classList.remove('initialized');

    // Ad_entity expects a jQuery object, and if enabled will also have
    // it as adependency.
    ad = window.jQuery(ad);
    Drupal.ad_entity.restrictAndInitialize([ad], document, drupalSettings);
  }
}

export default GalleryAds;
