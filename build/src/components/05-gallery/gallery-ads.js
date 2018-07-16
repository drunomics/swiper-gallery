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
    const adSlides = [];
    [].forEach.call(this.swiper.slides, function(slide) {
      let adContainer = slide.querySelectorAll('.ad-entity-container');
      if (adContainer.length > 0) {
        adSlides.push(slide);
      }
    });

    return adSlides;
  }

  /**
   * Initialize all ads in the gallery.
   */
  initializeAllAds() {
    this.getAdSlides().forEach(function(adSlide) {
      GalleryAds.initializeAd(adSlide);
    });
  }

  /**
   * Initialize ads on a specific slide.
   *
   * This will rewrite the ad-entity container id, as well as its sub-div id
   * to make sure we initialize with a unique id, so to not mess up the loading.
   *
   * @param {Object} adSlide
   *   A slide containing an ad.
   */
  static initializeAd(adSlide) {
    let ad = adSlide.querySelector('.ad-entity-container');

    log.info('initializeAd');
    log.info(ad);

    if (!ad.classList.contains('initialization-disabled')) {
      log.info('-- skip initialized');
      return;
    }

    const id = ad.id;
    const postfix = Math.random().toString(36).substr(2, 3);

    // Fix id.
    ad.id = id + '_' + postfix;
    // The sub element must have a unique id as well.
    const subDiv = ad.querySelector('div');
    subDiv.id = subDiv.id + '_' + postfix;

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
