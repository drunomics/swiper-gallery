import 'swiper/dist/js/swiper.js';
import 'featherlight/release/featherlight.min';
import enquire from 'enquire.js';
import Gallery from './gallery';

/**
 * A variant with vertical scrolling on mobile phones.
 */
class GalleryFsMobileScroll extends Gallery {

  /**
   * Gets the swiper config for the mobile variant.
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
      hashnav: true,
      hashnavWatchState: true,
      loop: false,
      paginationType: 'custom',
      // Disable preloading of all images
      preloadImages: false,
      // Enable lazy loading
      lazyLoading: true,
      paginationCustomRender: function (swiper, current, total) {
        return self.setPagination(swiper, current, total);
      }
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
          self.init();
        }
      },
      // Resets active config to default config.
      unmatch: () => {
        if (self.active) {
          self.config = self.defaultConfig;
          self.init();
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
    this.fixMobileContainerHeight();
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
        self.swiper.updateClasses();
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
  setPagination(swiper, current, total) {
    // Get gallery slides.
    let slides = this.content.querySelectorAll('.swiper-wrapper')[0].querySelectorAll('.gallery-slide');
    let activeSlide = slides[0].parentElement.querySelector('.swiper-slide-active');
    let calculated_current = ([...slides].indexOf(activeSlide) + 1);
    let calculated_total = parseInt(slides.length, 10);
    return '<span class="swiper-pagination-current">' + calculated_current + '</span> / <span class="swiper-pagination-total">' + calculated_total + '</span>';
  }
}

export {GalleryFsMobileScroll};
