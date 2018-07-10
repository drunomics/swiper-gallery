import 'swiper/dist/js/swiper.js';
import 'featherlight/release/featherlight.min';
import enquire from 'enquire.js';
import Gallery from './gallery';
import log from 'loglevel';

/**
 * A variant with vertical scrolling on mobile phones.
 */
class GalleryFsMobileScroll extends Gallery {

  /**
   * Gets the swiper config for the mobile variant.
   *
   * Overrides defaultConfig (see base class).
   *
   * @returns {Object}
   */
  get mobileConfig() {
    const self = this;
    return {
      freeMode: true,
      direction: 'vertical',
      spaceBetween: 10,
      autoHeight: true,
      slidesPerView: 'auto',
      watchSlidesVisibility: true,
      centeredSlides: false,
      loop: false,
      preloadImages: false,
      // Enable lazy loading.
      lazy: true,
      pagination: {
        el: '.gallery__pagination',
        type: 'custom',
        renderCustom: function (swiper, current, total) {
          return self.paginationHandler(swiper, current, total);
        },
      },
    };
  }

  /**
   * @inheritdoc
   */
  static get type() {
    return 'fs-mobile-scroll';
  }

  /**
   * @inheritdoc
   */
  registerBreakpointConfig() {
    let self = this;
    enquire.register('screen and (max-width:533px)', {
      match: () => {
        if (self.active) {
          self.config = self.defaultConfig;
          Object.assign(self.config, self.mobileConfig);
          self.initFeatherlight();
        }
      },
      // Resets active config to default config.
      unmatch: () => {
        if (self.active) {
          self.config = self.defaultConfig;
          self.initFeatherlight();
        }
      }
    })
  }

  /**
   * @inheritdoc
   */
  createSwiperInstance() {
    // We need to set a fixed height on the slider so it can calculate
    // meaningful measurements.
    this.fixVerticalContainerHeight();
    super.createSwiperInstance();

    // Updates the initial pagination which is showing negative numbers.
    // The initial pagination is not showing data from the custom pagination
    // handler, eg. for 1/11 it will show 12/-11, which must be a calculation
    // error inside of swiper.
    // With updateClasses it will use the handler (only necessary on mobile).
    // @see registerBreakpointConfig()
    // @see setPagination()
    const self = this;
    if (this.swiper.params.direction === 'vertical') {
      setTimeout(function () {
        self.swiper.update();
      }, 500);
    }
  }

  /**
   * Custom pagination handler submitted to the Swiper config.
   *
   * This takes unloades slides into account. Without this, Swiper will show
   * wrong pagination numbers.
   *
   * @param {Object} swiper
   *   Swiper instance.
   * @param {int} current
   *   Current slide.
   * @param {int} total
   *   Total slides.
   *
   * @returns {string}
   */
  paginationHandler(swiper, current, total) {
    // Get gallery slides.
    let slides = this.content.querySelectorAll('.swiper-wrapper')[0].querySelectorAll('.gallery-slide');
    let activeSlide = slides[0].parentElement.querySelector('.swiper-slide-active');
    let calculated_current = ([...slides].indexOf(activeSlide) + 1);
    let calculated_total = parseInt(slides.length, 10);
    return '<span class="swiper-pagination-current">' + calculated_current + '</span> / <span class="swiper-pagination-total">' + calculated_total + '</span>';
  }
}

export {GalleryFsMobileScroll};
