import log from 'loglevel';
import { debounce } from 'underscore';

/**
 * Ad handler for the gallery.
 */
class GalleryAds {

  /**
   * Initialize swiper instance.
   *
   * @param {Object} swiper
   *   The swiper instance.
   * @param {bool} isMobile
   *   Mobile version flag.
   */
  init(swiper, isMobile) {
    if (typeof(Drupal.ad_entity) === "undefined") {
      log.info('Ad entity library not found.');
      return;
    }

    this.swiper = swiper;
    this.isMobile = isMobile;

    // In case gallery was duplicated but ads are already initialized.
    this.swiper.update();

    let self = this;

    window.addEventListener('resize', debounce(function () {
      //this.swiper.update();
    }, 100));

    // Looping swiper will generate duplicates of slides, in this case we need
    // to initialize the slides/duplicates when we slide to it.
    this.swiper.on('slideChangeStart', function (swiper) {
      // Initialize ads in the immediate vicinity.
      for (var i = -2; i < 3; i++) {
        self.initializeAdSlide(i);
      }
    });
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
   * Initialize ad on current slide.
   *
   * @param {int} offset
   *   The offset to the current slide. eg.: -1 to address the previous slide.
   */
  initializeAdSlide(offset) {
    offset = offset || 0;
    let swiper = this.swiper;
    let index = swiper.activeIndex + offset;
    let slide = swiper.slides[index];

    if (typeof(slide) !== "undefined" && slide.querySelectorAll('.ad-entity-container').length > 0) {
      this.initializeAd(slide);
    }
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
  initializeAd(ad_slide) {
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
    this.swiper.update();
  }

  /**
   * Initialize all ads in the gallery.
   *
   * This should be used only if the the gallery has loop disabled. A looping
   * gallery will duplicate the slides and thus introduce duplicate container-
   * ids, which makes loading of ads impossible.
   *
   * In case of looping use the dynamic approach per slide change.
   * @see init()
   * @see initializeAdSlide()
   */
  initializeAllAds() {
    let self = this;
    this.getAdSlides().forEach(function(ad_slide) {
      self.initializeAd(ad_slide);
    });
  }
}

export default GalleryAds;
