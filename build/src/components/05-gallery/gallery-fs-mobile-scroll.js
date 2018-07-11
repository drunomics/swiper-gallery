import enquire from 'enquire.js';
import Gallery from './gallery';

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
    let self = this;
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
      lazy: true,
      pagination: {
        el: '.gallery__pagination',
        type: 'custom',
        renderCustom: function (swiper, current, total) {
          // The total provided by swiper will be the amount of loaded slides.
          // We provide the real total value by counting the slides.
          let slides = self.content.querySelectorAll('.swiper-wrapper')[0].querySelectorAll('.gallery-slide');
          return '<span class="swiper-pagination-current">' + current + '</span> / <span class="swiper-pagination-total">' + slides.length + '</span>';
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
}

export {GalleryFsMobileScroll};
