import enquire from 'enquire.js';
import Gallery from './gallery';
import log from 'loglevel';

/**
 * A variant with vertical scrolling on mobile phones.
 */
class GalleryFsMobileScroll extends Gallery {

  /**
   * @inheritdoc
   */
  static get type() {
    return 'fs-mobile-scroll';
  }

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
  registerBreakpointConfig() {
    let self = this;
    enquire.register('screen and (max-width:' + Gallery.mobileBreakpoint + 'px)', {
      match: () => {
        // Apply mobile config.
        self.config = self.defaultConfig;
        Object.assign(self.config, self.mobileConfig);
        // Reinitialize if already opened (resize event).
        if (self.active) {
          self.initFeatherlight();
        }
      },
      unmatch: () => {
        // Set to default config.
        self.config = self.defaultConfig;
        // Reinitialize if already opened (resize event).
        if (self.active) {
          self.initFeatherlight();
        }
      }
    })
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
