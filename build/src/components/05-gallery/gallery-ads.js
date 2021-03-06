import log from 'loglevel';

/**
 * Ad handler for the gallery.
 */
class GalleryAds {

  /**
   * Initialize ads for swiper instance.
   *
   * @param {Object} swiper
   *   The swiper instance.
   */
  init(swiper) {
    if (typeof(Drupal.ad_entity) === "undefined") {
      return;
    }

    this.swiper = swiper;
    this.fixAllAdSlideIds();

    // Initialize ads.
    const context = swiper.el;
    let containers = Drupal.ad_entity.collectAdContainers(context, drupalSettings);
    Drupal.ad_entity.restrictAndInitialize(containers, context, drupalSettings);
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
      if (GalleryAds.slideContainsAd(slide)) {
        adSlides.push(slide);
      }
    });

    return adSlides;
  }

  /**
   * Fix ids for all ads in the gallery.
   */
  fixAllAdSlideIds() {
    this.getAdSlides().forEach(function(slide) {
      GalleryAds.fixAdSlideId(slide);
    });
  }

  /**
   * Fix ad slide id for a specific slide.
   *
   * This will rewrite the ad-entity container id, as well as its sub-div id
   * to make sure we initialize with a unique id, so to not mess up the loading.
   *
   * @param {Object} slide
   *   A slide containing an ad.
   */
  static fixAdSlideId(slide) {
    let ad = slide.querySelector('.ad-entity-container');

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

    // Allow initialization if its not a duplicated slide.
    if (!slide.classList.contains('swiper-slide-duplicate')) {
      ad.classList.remove('initialization-disabled');
    }
  }

  /**
   * Checks whether the slide contains an ad.
   *
   * @param {Object} slide
   *   Swiper slide.
   * @returns {boolean}
   */
  static slideContainsAd(slide) {
    return slide.querySelectorAll('.ad-entity-container').length > 0;
  }
}

export default GalleryAds;
