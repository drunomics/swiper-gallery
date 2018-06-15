import 'swiper/dist/js/swiper.js';
import 'featherlight/release/featherlight.min';
import enquire from 'enquire.js';
import log from 'loglevel';
import { debounce } from 'underscore';
import GalleryPI from './gallery-pi';
import { SwiperGalleryBreakpoints } from '../../00-base/02-breakpoints/breakpoints'

let breakpoints = new SwiperGalleryBreakpoints();

// Limit smaller than 200 can trigger flickering behavior when resizing the
// gallery.
let debounce_limit = 200;

/**
 * An instance of a gallery.
 */
class Gallery {
  static get type() {
    return 'default';
  }

  /**
   * Attaches the class to the elements of the given selector.
   *
   * The class will only be attached if the data-gallery-type matches the
   * defined type.
   */
  static attach(context, settings, selector = '.gallery') {
    let self = this;
    context.querySelectorAll(selector).forEach((element) => {
      if (element.getAttribute('data-gallery-type') !== self.type) {
          return;
      }

      var instance_settings = {};
      for (var key in settings) {
        if (element.classList.contains(key)) {
          instance_settings = settings[key];
        }
      }
      element.gallery = new self(element, instance_settings);
      element.querySelectorAll('.gallery-launcher').forEach((e) => {
        if (e.classList.contains('gallery-launcher-main')) {
          element.gallery.showSlideIfGiven();
        }
        e.addEventListener('click', () => {
          // Ensure there is a new, clean gallery instance on every click.
          element.gallery = new self(element, instance_settings);
          element.gallery.launch('');
        })
      });
    })
  }

  /**
   * Adds class to all elements matching the selector.
   *
   * @param {Node} scope
   * @param {string} querySelector
   * @param {string} className
   * @private
   */
  static addClass(scope, querySelector, className) {
    scope.querySelectorAll(querySelector).forEach((element) => {
      element.classList.add(className)
    })
  }

  constructor(element, settings) {
    this.settings = settings || {};
    this.originalElement = element;
    this.element = element.cloneNode(true);

    this.type = this.element.getAttribute('data-gallery-type');
    this.title = this.element.getAttribute('data-gallery-title');
    this.slideIdPrefix = this.element.getAttribute('data-gallery-slide-id-prefix');
    this.active = false;

    // We need to clone the content as featherlight destroys it after closing.
    // Se we always pass cloned content to featherlight.
    this.content = this.element.querySelectorAll('.gallery__main')[0];
    this.swiperContainer = this.content.querySelectorAll('.swiper-container')[0];

    // Initialize thumb gallery.
    this.thumbContent = this.element.querySelectorAll('.gallery__thumbs')[0];
    this.swiperThumbContainer = this.thumbContent.querySelectorAll('.swiper-container')[0];

    // Set default config and show it.
    this.config = this.defaultConfig;
    this.thumbConfig = this.defaultThumbConfig;
    // Check if orientation has changed.
    this.orientationchange = false;

    this.alreadyOpened = false;
  }

  setAdSwiperSlideHeight() {
    if (breakpoints.isMobile()) {
      return;
    }
    let slides = [...this.content.querySelectorAll('.gallery-slide')];
    let firstSlide = slides[0];
    let adslides = slides.filter((e) => {
      return e.dataset.hash.indexOf('slide-ad') !== -1;
    });
    adslides.forEach((e) => {
      e.clientHeight = firstSlide.querySelector('.media').clientHeight;
    });
  }

  /**
   * Update gallery and slides.
   */
  updateGallery(origin) {
    // Judge on the elapsed time between two calls to this function from
    // 'orientationchange' and/or 'resize' as sometimes they can be fired both
    // while the screen resolution changes. To prevent a double call of this
    // function the time between those calls must be larger than 50ms.
    let start = new Date().getTime();

    if (this.elapsed === undefined) {
      this.elapsed = 0;
    }

    if (start - this.elapsed > 50) {
      this.swiperThumb.destroy(false, true);
      this.swiper.destroy(false, true);
      this._createSwiper();


      this.swiper.update(true);
      this.swiper.updateContainerSize();
      this.swiper.updateSlidesSize();

      // After 500ms slide to the previously active slide, because before the
      // gallery is not yet ready.
      setTimeout(() => {
        this.swiper.slideTo(this.activeSlide);
        if (!breakpoints.isMobile()) {
          this.swiperThumb.slideTo(this.activeSlide);
        }
      }, 500);
      this.swiper.slideTo(this.activeSlide);

      this.setImageHeight();
    }

    this.elapsed = start;
    this.originBefore = origin;
  }

  /**
   * Calculate gallery height and width.
   *
   * @param {Array} heightwidth
   *   First element is height, second element is width.
   *
   * @return {Array}
   *   The calculated height and width.
   */
  calculateGalleryImageHeightWidth(heightwidth) {
    let featherlightContent = document.querySelector('.featherlight-content');
    let wh = [];

    wh.height = heightwidth[0];
    if (featherlightContent.offsetHeight < heightwidth[0]) {
      wh.height = featherlightContent.offsetHeight;
    }

    wh.width = heightwidth[1];
    if (featherlightContent.offsetWidth < heightwidth[1]) {
      wh.width = featherlightContent.offsetWidth;
    }

    return wh;
  }

  /**
   * Check bounding box width (boxImageWidth) and height (boxImageHeight) to
   * figuere out if the image has to be scaled to the width or height of the
   * bounding box.
   *
   * @param {Node} image
   *   A single image in the gallery.
   * @param {number} availableImageHeight
   *   Available height for the image in the bounding box.
   * @param {number} boxImageWidth
   *   Bounding box width.
   */
  setImageHeightWidth (image, availableImageHeight, boxImageWidth) {
    let boxImageHeight = availableImageHeight - (parseInt(image.closest('.media-image').offsetHeight, 10) - parseInt(image.offsetHeight, 10));

    // Remove possible padding to image.
    image.parentElement.style.removeProperty('padding-top');
    image.parentElement.style.removeProperty('padding-bottom');

    // First check if original image width and height is smaller than the
    // bounding box. In that case set the width and height to the image's
    // original width and height.
    let imageHeight = image.getAttribute('height');
    let imageWidth = image.getAttribute('width');
    if (imageHeight <= boxImageHeight && imageWidth <= boxImageWidth) {
      // In case the image height or width could not be calculated when
      // initializing the gallery set initial width and height of the bounding
      // box to the image.

      if (imageWidth === 0 || imageHeight === 0) {
        image.style.height = boxImageHeight + 'px';
        image.style.width = 'inherit';
      }
      else {
        image.style.height = imageHeight + 'px';
        image.style.width = imageWidth + 'px';

        // Add padding to top and bottom to center image.
        if (boxImageHeight > imageHeight) {
          let paddingTopBottom = (boxImageHeight - imageHeight) / 2;
          image.parentElement.style.setProperty('padding-top', paddingTopBottom + 'px');
          image.parentElement.style.setProperty('padding-bottom', paddingTopBottom + 'px');
        }
      }
    }
    else {
      let imageCalculatedHeight = boxImageWidth * imageHeight / imageWidth;
      let imageCalculatedWidth = boxImageHeight * imageWidth / imageHeight;

      // Height of image is smaller than bounding box height.
      if (boxImageHeight > imageHeight) {
        image.style.height = imageCalculatedHeight + 'px';
        image.style.width = imageCalculatedWidth + 'px';

        let paddingTopBottom = (boxImageHeight - imageCalculatedHeight) / 2;
        image.parentElement.style.setProperty('padding-top', paddingTopBottom + 'px');
        image.parentElement.style.setProperty('padding-bottom', paddingTopBottom + 'px');
      }
      else {
        // Height of calculated image is larger than bounding box height.
        if (imageCalculatedHeight >= boxImageHeight) {
          image.style.height = boxImageHeight + 'px';
          image.style.width = 'inherit';
        }
        else {
          image.style.height = 'inherit';
          image.style.width = boxImageWidth + 'px';
        }
      }
    }
    this.setAdSwiperSlideHeight();
    this.swiper.update(true);
  }

  /**
   * Sets height of active image in swiper slide.
   */
  setImageHeight() {
    // If the window height is too low to display images correctly set a class
    // which hides thumbs and sets the title to the top (like on mobile).
    let windowheight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
    let windowwidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;

    if (windowheight < 550) {
      this.content.parentElement.classList.add('is-landscape');
    }
    else {
      this.content.parentElement.classList.remove('is-landscape');
    }

    if (windowwidth > 1000) {
      this.content.parentElement.classList.add('has-media-compensation');
    }
    else {
      this.content.parentElement.classList.remove('has-media-compensation');
    }

    let featherlightContent = document.querySelector('.featherlight-content');
    featherlightContent.removeAttribute('style');

    // Calculate width and height of featherligt gallery content area.
    let galleryHeightWidth = this.calculateGalleryImageHeightWidth([windowheight, windowwidth]);

    featherlightContent.style.setProperty('width', galleryHeightWidth.width + 'px');

    let featherlightStyle = window.getComputedStyle(featherlightContent, null);
    let flPaddingTopBottom = parseInt(featherlightStyle.getPropertyValue("padding-top"), 10) + parseInt(featherlightStyle.getPropertyValue("padding-bottom"), 10);
    let flPaddingLeftRight = parseInt(featherlightStyle.getPropertyValue("padding-left"), 10) + parseInt(featherlightStyle.getPropertyValue("padding-right"), 10);

    let thumbHeight = this.thumbContent.offsetHeight;
    let headerHeight = this.content.querySelector('.gallery__header').offsetHeight;
    let headerOffset = this.content.querySelector('.gallery__header').offsetTop;
    let images = this.content.querySelector('.swiper-wrapper').querySelectorAll('img');

    // Calculate available image height and width in the bounding box of the
    // gallery.
    // Available height of a gallery image is the remaining height of the
    // gallery content area minus height of thumbnails, header, header offset
    // and padding of image area.
    let availableImageHeight = galleryHeightWidth.height - thumbHeight - headerHeight  - headerOffset - flPaddingTopBottom;

    // Set the maximum available height to 600px if more space should be
    // available.
    if (availableImageHeight > 600) {
      availableImageHeight = 600;
    }

    // Available width of a gallery image is the remaining width of the gallery
    // content area minus padding of image area.
    let boxImageWidth = galleryHeightWidth.width - flPaddingLeftRight;

    // Set the maximum available width to 1000px if more space should be
    // available.
    if (boxImageWidth > 1000) {
      boxImageWidth = 1000;
    }

    // Convert the HTML Collection to an array.
    images = [...images];

    images.forEach((image, index) => {
      // Unset image styles
      image.removeAttribute('style');
      image.parentElement.removeAttribute('style');

      let imageWrapper = image.closest('.media-image');
      let shareLinks = imageWrapper.querySelectorAll('.media__share-links');

      if (shareLinks.clientHeight === 0) {
        shareLinks.forEach((element) => {
          element.style.setProperty('margin-bottom', 0);
          element.style.setProperty('margin-top', 0);
        })
        imageWrapper.querySelectorAll('.media__image').forEach((element) => {
          element.style.setProperty('padding-bottom', 0);
          element.style.setProperty('margin-top', '4px');
        })
      }

      if (breakpoints.isMobile()) {
        image.style.height = 'auto';
        image.parentElement.removeAttribute('style');

        // Set top padding for first slide to the height of the header.
        if (index === 0) {
          imageWrapper.style.setProperty('padding-top', headerHeight + 'px');
        }
      }
      else {
        // Remove top padding for first slide.
        imageWrapper.style.setProperty('padding-top', 0);

        // Set height and width of image after 50ms to be sure the resizing of
        // the window has finished and the possible change of orientation shows
        // the correct values.
        setTimeout(() => {
          this.setImageHeightWidth(image, availableImageHeight, boxImageWidth);
        }, 50);
      }
    }, this);
    this.swiper.update(true);
  }

  /**
   * Set height of Swiper Container.
   */
  setContainerHeight() {
    if (breakpoints.isMobile()) {
      this.swiperContainer.style.setProperty('height', document.querySelector('.featherlight').clientHeight + 'px');
    }
  }

  setActiveSlideByHash(hash) {
    // Get gallery slides.
    let slides = this.content.querySelectorAll('.swiper-wrapper')[0].querySelectorAll('.gallery-slide');
    let activeSlide = this.element.querySelectorAll("[data-hash='" + hash + "']")[0];
    this.activeSlide = [...slides].indexOf(activeSlide);
  }

  /**
   * Initially launches the gallery.
   */
  launch(hash) {
    // Push current page to history stack to be able to return to it when
    // back button is clicked.
    if (!this.alreadyOpened) {
      history.pushState(null, document.title, location.href);
      this.alreadyOpened = true;
    }

    this.show();
    this.setImageHeight();

    // If we start the gallery with a has tag we slide to the active slide.
    if (hash) {
      this.setActiveSlideByHash(hash);
    }

    // If browser is resized calculate image and container height (and width).
    window.addEventListener('resize', debounce(() => {
      if (this.orientationchange) {
        this.orientationchange = false;
      }
      else {
        this.setImageHeight();
        this.setContainerHeight();
        this.hideAddressBar();
      }
    }, debounce_limit));

    // If we change orientation we have to create new swiper instance as gallery
    // slide widths are not updates by Swiper in the same way as on a resize
    // event. This problem occurs when the gallery is already in landscape
    // format.
    window.addEventListener('orientationchange', debounce(() => {
      this.updateGallery('orientationchange');
      if (this.orientationchange) {
        log.info('Change orientation of device to ' + this.orientation);
        this.orientationchange = false;
      }
      else {
        this.setImageHeight();
        this.setContainerHeight();
      }
    }, debounce_limit));

    this.preventSwipeOnButtons();

    // Add breakpoint-specific changes of config.
    this.registerBreakpointConfig();

    this.hideAddressBar();
    this.quickHideAddressBar();
    let event = new Event('gallery:launched');
    this.originalElement.dispatchEvent(event);
  }

  /**
   * Hide address bar on devices like the iPhone.
   * Source: http://menacingcloud.com/?c=iPhoneAddressBar
   */
  hideAddressBar() {
    let bodyTag = document.querySelector('body');

    // Big screen. Fixed chrome likely.
    if (screen.width > 980 || screen.height > 980)
      return;

    // Standalone (full screen webapp) mode.
    if(window.navigator.standalone === true)
      return;

    // Page zoom or vertical scrollbars
    if (window.innerWidth !== document.documentElement.clientWidth) {
      // Sometimes one pixel too much. Compensate.
      if((window.innerWidth - 1) !== document.documentElement.clientWidth)
        return;
    }

    // Pad content if necessary.
    if (document.documentElement.scrollHeight <= document.documentElement.clientHeight) {
      // Viewport height at fullscreen
      bodyTag.style.height = document.documentElement.clientWidth / screen.width * screen.height + 'px';
    }

    setTimeout(function() {
      // Already scrolled?
      if(window.pageYOffset !== 0)
        return;

      // Perform autoscroll.
      window.scrollTo(0, 1);

      // Reset body height and scroll.
      if(bodyTag !== undefined)
        bodyTag.style.height = window.innerHeight + 'px';
      window.scrollTo(0, 0);
    }, 1000);
  }

  /**
   * Quick address bar hide on devices like the iPhone.
   */
  quickHideAddressBar() {
    let self = this;

    window.addEventListener( "load",function() {
      setTimeout(function(){
        window.scrollTo(0, window.pageYOffset + 1);
      }, 0);
    });
    window.addEventListener( "orientationchange",function() {
      setTimeout(function(){
        self.hideAddressBar();
        window.scrollTo(0, window.pageYOffset + 1);
      }, 0);
    });
    window.addEventListener( "touchstart",function() {
      setTimeout(function(){
        window.scrollTo(0, window.pageYOffset + 1);
      }, 0);
    });

    setTimeout(function() {
      if(window.pageYOffset !== 0) return;
      window.scrollTo(0, window.pageYOffset + 1);

    }, 1000);
  }

  /**
   * Basic config that applies to every breakpoint (if not overridden).
   */
  get defaultConfig() {
    let loopedSlides = this.content.querySelectorAll('.swiper-wrapper .swiper-slide:not(.swiper-slide-duplicate)').length;

    return {
      speed: 400,
      nextButton: '.gallery__button-next',
      prevButton: '.gallery__button-prev',
      grabCursor: true,
      hashnav: true,
      hashnavWatchState: true,
      replaceState: !!this.settings.hashNavReplaceState,
      keyboardControl: true,
      pagination: '.gallery__pagination',
      paginationType: 'fraction',
      centeredSlides: true,
      // Disable preloading of all images
      preloadImages: false,
      // Enable lazy loading
      lazyLoading: true,
      loop: true,
      loopedSlides: loopedSlides,
      watchSlidesVisibility: true
    };
  }

  get defaultThumbConfig() {
    let loopedSlides = this.thumbContent.querySelectorAll('.swiper-wrapper .swiper-slide:not(.swiper-slide-duplicate)').length;

    return {
      loop: true,
      slidesPerView: 'auto',
      loopedSlides: loopedSlides,
      spaceBetween: 10,
      centeredSlides: true,
      touchRatio: 0.2,
      watchSlidesVisibility: true,
      slideToClickedSlide: true
    };
  }

  /**
   * Registers breakpoint-specific config.
   *
   * Note that we do do not use the swiper breakpoint config as it does not
   * support changing all swiper options. Instead we re-init the whole swiper
   * when necessary.
   */
  registerBreakpointConfig() {
    // See GalleryFsMobileScroll.registerBreakpointConfig() for an example.
  }

  /**
   * Resets active config to default config.
   */
  applyDefaultConfig() {
    if (!this.active) {
      // Do nothing if gallery is not active.
      return;
    }
    log.info('Apply default config');
    this.config = this.defaultConfig;
    this.orientationchange = true;
    this.show();
  }

  /**
   * Registers breakpoint-specific config.
   *
   * @param name
   *   Some human readable name for debugging purposes.
   * @param breakpointConfig
   *   Breakpoint-specific config to apply in addition to the default config.
   */
  applyBreakpointConfig(name, breakpointConfig) {
    if (!this.active) {
      // Do nothing if gallery is not active.
      return;
    }
    log.info('Apply breakpoint config ' + name);
    this.config = this.defaultConfig;
    this.orientationchange = true;
    Object.assign(this.config, breakpointConfig);
    this.show();
  }

  /**
   * Initializes the config dependent on the currently active breakpoints.
   */
  _initializeConfig() {
    // Process the config as necessary for swiper.
    if (this.config.prevButton.length) {
      this.config.prevButton = this.swiperContainer.querySelectorAll(this.config.prevButton)[0];
    }
    if (this.config.nextButton.length) {
      this.config.nextButton = this.swiperContainer.querySelectorAll(this.config.nextButton)[0];
    }
    if (this.config.pagination.length) {
      this.config.pagination = this.swiperContainer.querySelectorAll(this.config.pagination)[0];
    }
  }

  /**
   * Shows the gallery in featherlight.
   *
   * If the gallery is already active, the swiper instance is re-initialized.
   * If the gallery is loaded with a slide ID in the hash the gallery is opened
   * with that slide and will be closed by clearing the hash.
   * Otherwise the hash will be the ID of the gallery element.
   */
  show() {
    let self = this;

    if (this.active) {
      // Do not delete swiper instances as swiper resize events might fire
      // later than our enquire.js resize events. To prevent errors, we kust
      // keep them around but detach them.
      this.swiperThumb.destroy(false, true);
      this.swiper.destroy(false, true);
      this._createSwiper();
    }
    else {
      let hashchange = () => {
        self.handleHashChange()
      };
        // Make the fullscreen gallery active.
        window.jQuery.featherlight(self.element, {
        type: 'html',
        variant: 'gallery-featherlight',
        // We need to wrap it in an anonymous function to avoid featherlight
        // messing with our "this".
        afterContent: function() {
          self.element.classList.remove('is-inactive');
          self.element.classList.add('is-active');
          self.active = true;
          self._createSwiper();
          window.addEventListener('hashchange', hashchange);
        },
        afterClose: function() {
          self.active = false;
          self.element.classList.add('is-inactive');
          self.element.classList.remove('is-active');

          // Remove the slide hash from URL.
          history.replaceState(undefined, undefined, window.location.pathname);

          window.removeEventListener('hashchange', hashchange);
        }
      });
    }
  }

  /**
   * React on new page impressions due to hash changes.
   */
  registerGalleryPageImpressionEventHandler() {
    // Swiper seems to overwrite other onHashChange event handler, thus use
    // swiper to fire the event handler again.
    this.swiper.on('slideChangeStart', debounce(() => {
      GalleryPI.trackNewPageImpression();
    }, debounce_limit));
  }

  /**
   * Close featherlight when hash state is deleted from URL,
   * otherwise it won't close the gallery when back button is clicked.
   */
  handleHashChange() {
    if (!location.hash) {
      if (window.jQuery.featherlight.current()) {
        window.jQuery.featherlight.current().close();
      }
    }
  }

  _createSwiper() {
    log.info('-- create swiper');
    this._initializeConfig();
    this.swiper = new Swiper(this.swiperContainer, this.config);
    // Ensure the hash of the first slide is written once enabled in
    // fullscreen.
    this.swiper.hashnav.setHash();
    // Track page impression of first slide.
    GalleryPI.trackNewPageImpression();

    log.info('Creating swiper thumbs instance');
    this.swiperThumb = new Swiper(this.swiperThumbContainer, this.thumbConfig);
    this.swiperThumb.params.control = this.swiper;
    this.swiper.params.control = this.swiperThumb;

    this.registerGalleryPageImpressionEventHandler();
  }

  /**
   * If the fragment of a specific slide is given, launch the gallery.
   */
  showSlideIfGiven() {
    let hash = this.getSlideHash();
    if (hash) {
      this.launch(hash);
    }
  }

  getSlideHash() {
    if (window.location.hash) {
      let hash = window.location.hash.substring(1);

      // If the element has the slide with the given ID, launch it.
      if (hash && hash.startsWith(this.slideIdPrefix) && this.element.querySelectorAll("[data-hash='" + hash + "']").length) {
        return hash;
      }
    }
    return false;
  }

  stopPropagation(button) {
    let stopPropagation = (e) => {
      e.stopPropagation();
    };
    button.addEventListener('mouseDown', stopPropagation);
    button.addEventListener('touchstart', stopPropagation);
  }

  preventSwipeOnButtons() {
    this.stopPropagation(this.config.prevButton);
    this.stopPropagation(this.config.nextButton);
  }
}

/**
 * A variant with mobile scrolling.
 */
class GalleryFsMobileScroll extends Gallery {

  static get type() {
    return 'fs-mobile-scroll';
  }

  /**
   * Registers breakpoint-specific config.
   *
   * Note that we do do not use the swiper breakpoint config as it does not
   * support changing all swiper options. Instead we re-init the whole swiper
   * when necessary.
   */
  registerBreakpointConfig() {
    let self = this;
    enquire.register('screen and (max-width:533px)', {
      match: () => {
        this.applyBreakpointConfig('mobile', {
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
          paginationCustomRender: function () {
            return self.setPagination();
          }
        });
        this._initializeAllAds();
      },
      unmatch: () => this.applyDefaultConfig(),
    });
  }

  setPagination() {
    // Get gallery slides.
    let slides = this.content.querySelectorAll('.swiper-wrapper')[0].querySelectorAll('.gallery-slide');
    let activeSlide = slides[0].parentElement.querySelector('.swiper-slide-active');
    let current = ([...slides].indexOf(activeSlide) + 1);
    let total = parseInt(slides.length, 10);

    // Set counter.
    return '<span class="swiper-pagination-current">' + current + '</span> / <span class="swiper-pagination-total">' + total + '</span>';
  }

  _createSwiper() {
    let self = this;

    // We need to set a fixed height on the slider so it can calculate
    // meaningful measurements.
    this.setContainerHeight();

    super._createSwiper();
    this.swiper.update(true);

    // Update swiper gallery on image load
    // to avoid issues with container height.
    this.swiper.on('onLazyImageLoad', (swiper) => {
      swiper.update();
    })

    this.swiper.on('onLazyImageReady', (swiper) => {
      swiper.update();
    })

    // Catch the active slide and display ads after fifth slide.
    this.swiper.on('slideChangeStart', (swiper) => {
      if (((swiper.realIndex + 1) % 6) === 0) {
        let gallery_ad = self.swiperContainer.querySelectorAll('.gallery-ad')[((swiper.realIndex + 1) / 6) - 1];
        if (typeof gallery_ad !== "undefined") {
          self._initializeAd(gallery_ad);
        }
      }

      // Get active gallery slide.
      let slides = this.content.querySelector('.swiper-wrapper').querySelectorAll('.gallery-slide');
      let index = 0;
      [...slides].some((slide) => {
        let activeSlide = slide.parentElement.querySelector('.swiper-slide-active');
        if (activeSlide.length !== 0) {
          index = [...slide.parentElement.children].indexOf(activeSlide);
          return true;
        }
        return false;
      });
      this.activeSlide = parseInt(index, 10);
    });
  }

  _initializeAllAds() {
    let self = this;
    // Without the timeout, the ads won't load, if the gallery is opened via a link
    // (with a #, which opens the gallery automatically)
    setTimeout(() => {
      self.swiperContainer.querySelectorAll('.gallery-ad').forEach((gallery_ad) => {
        self._initializeAd(gallery_ad);
      })
    }, 0);
  }

  _initializeAd(ad) {
    // Manually init the ad to show.
    Gallery.addClass(ad, '.not-initialized', 'ad-entity-container');
    Drupal.behaviors.adEntityView.attach(ad, drupalSettings);

    // Update swiper object so ads will be recognized.
    this.swiper.update();
  }

}

export {Gallery, GalleryFsMobileScroll};
