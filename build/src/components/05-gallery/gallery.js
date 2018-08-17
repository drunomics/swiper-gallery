import Swiper from 'swiper/dist/js/swiper.js';
import 'featherlight/release/featherlight.min';
import log from 'loglevel';
import { debounce } from 'underscore';
import GalleryPI from './gallery-pi';
import GalleryAds from './gallery-ads';

/**
 * Default gallery.
 */
class Gallery {

  /**
   * Gallery type.
   *
   * @returns {string}
   */
  static get type() {
    return 'default';
  }

  /**
   * Mobile breakpoint.
   *
   * @returns {number}
   */
  static get mobileBreakpoint() {
    return 534;
  }

  /**
   * Wait parameter for debounce.
   *
   * Limit smaller than 200 may trigger flickering behavior when resizing the
   * gallery.
   *
   * @returns {number}
   */
  static get debounceLimit() {
    return 200;
  }

  /**
   * Swiper config for the main swiper instance.
   *
   * @return {Object}
   */
  get defaultConfig() {
    const loopedSlides = this.content.querySelectorAll('.swiper-wrapper .swiper-slide:not(.swiper-slide-duplicate)').length;
    const self = this;

    return {
      speed: 400,
      navigation: {
        nextEl: '.gallery__button-next',
        prevEl: '.gallery__button-prev',
      },
      grabCursor: true,
      hashNavigation: {
        watchState: true,
        replaceState: !!this.settings.hashNavReplaceState,
      },
      keyboard: true,
      pagination: {
        el: '.gallery__pagination',
        type: 'fraction',
      },
      // Disable preloading of all images.
      preloadImages: false,
      // Enable lazy loading.
      lazy: {
        loadPrevNext: true,
      },
      loop: true,
      loopedSlides: loopedSlides,
      watchSlidesVisibility: true,
      updateOnImagesReady: true,
      on: {
        lazyImageReady: function (slide, image) {
          // This makes sure that swiper calculations work properly after images
          // are loaded (which changes container size for vertical scrolling.)
          if (typeof(self.swiper) !== "undefined") {
            self.swiper.update();
          }
        },
        slideChangeTransitionEnd: function() {
          // Track new page impressions due to hash changes.
          GalleryPI.trackNewPageImpression();
        }
      }
    };
  }

  /**
   * Swiper config for the thumbnail swiper instance.
   *
   * @return {Object}
   */
  get defaultThumbConfig() {
    const loopedSlides = this.thumbContent.querySelectorAll('.swiper-wrapper .swiper-slide:not(.swiper-slide-duplicate)').length;

    return {
      loop: true,
      slidesPerView: 'auto',
      loopedSlides: loopedSlides,
      spaceBetween: 10,
      centeredSlides: true,
      touchRatio: 0.2,
      slideToClickedSlide: true,
      watchSlidesVisibility: true,
    };
  }

  /**
   * Attaches the gallery to the elements of the given selector.
   *
   * A page can contain multiple galleries. The class will only be attached if
   * the data-gallery-type matches the defined type.
   *
   * @param {string} context
   *   Dom context.
   * @param {Array} settings
   *   Custom gallery settings passed by the field formatter.
   * @param {string} selector
   *   Gallery will be attached to all elements with this selector.
   */
  static attach(context, settings, selector = '.gallery') {
    const self = this;
    context.querySelectorAll(selector).forEach((element) => {
      if (element.getAttribute('data-gallery-type') !== self.type) {
          return;
      }

      // Settings can differ depending on which viewmode is attached.
      let instanceSettings = {};
      for (const key in settings) {
        if (element.classList.contains(key)) {
          instanceSettings = settings[key];
          break;
        }
      }

      // Remove empty breakers. Since a breaker could be any block really, we
      // do not know if some condition applies which leads to an empty slide.
      [].forEach.call(element.querySelectorAll('.gallery__main .swiper-slide-breaker'), (slide) => {
        const breaker = slide.querySelector('.gallery-breaker');
        if (breaker && breaker.innerHTML.trim().length === 0) {
          const slideId = slide.getAttribute('data-hash');
          const thumb = element.querySelector('.gallery__thumbs .swiper-slide[data-hash="' + slideId + '"]');
          slide.parentNode.removeChild(slide);
          thumb.parentNode.removeChild(thumb);
        }
      });

      element.gallery = new self(element, instanceSettings);
      element.querySelectorAll('.gallery-launcher').forEach((launcher) => {
        if (launcher.classList.contains('gallery-launcher-main')) {
          // Launch if a slide hash is available in the url.
          if (element.gallery.getSlideHash()) {
            element.gallery.launch();
          }
        }
        launcher.addEventListener('click', () => {
          // Ensure there is a new, clean gallery instance on every click.
          element.gallery = new self(element, instanceSettings);
          element.gallery.launch();
        })
      });
    })
  }

  /**
   * Constructor.
   *
   * @param {Object} element
   *   Gallery Node.
   * @param {Array} settings
   *   Viewmode specific gallery settings.
   */
  constructor(element, settings) {
    this.settings = settings || {};
    this.originalElement = element;
    this.element = element.cloneNode(true);
    this.adHandler = new GalleryAds();

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

    // Set default config.
    this.config = this.defaultConfig;
    this.thumbConfig = this.defaultThumbConfig;

    this.alreadyOpened = false;
  }

  /**
   * Initially launches the gallery.
   */
  launch() {
    // Push current page to history stack to be able to return to it when
    // back button is clicked.
    if (!this.alreadyOpened) {
      history.pushState(null, document.title, location.href);
      this.alreadyOpened = true;
    }

    // If browser is resized calculate image and container height (and width).
    window.addEventListener('resize', debounce(this.onResize.bind(this), Gallery.debounceLimit));

    // If we change orientation we have to create new swiper instance as gallery
    // slide widths are not updates by Swiper in the same way as on a resize
    // event. This problem occurs when the gallery is already in landscape
    // format.
    window.addEventListener('orientationchange', debounce(this.onOrientationChange.bind(this), Gallery.debounceLimit));

    this.preventSwipeOnButton(this.config.navigation.nextEl);
    this.preventSwipeOnButton(this.config.navigation.prevEl);

    // Add breakpoint-specific changes of config.
    this.registerBreakpointConfig();
    this.initFeatherlight();
    this.fixSlideHeights();
    this.swiper.update(true);

    this.hideAddressBar();
    this.quickHideAddressBar();

    let event = new CustomEvent('gallery:launched');
    this.originalElement.dispatchEvent(event);
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
   * Shows the gallery in featherlight.
   *
   * If the gallery is already active, the swiper instance is re-initialized.
   * If the gallery is loaded with a slide ID in the hash the gallery is opened
   * with that slide and will be closed by clearing the hash.
   * Otherwise the hash will be the ID of the gallery element.
   */
  initFeatherlight() {
    const self = this;

    if (this.active) {
      log.info('reinitialize active instance');
      // Do not delete swiper instances as swiper resize events might fire
      // later than our enquire.js resize events. To prevent errors, we must
      // keep them around but detach them.
      this.swiperThumb.destroy(false, true);
      this.swiper.destroy(false, true);
      this.createSwiperInstance();
    }
    else {
      // Close featherlight when hash state is deleted from URL, otherwise it
      // won't close the gallery when back button is clicked.
      const onhashchange = () => {
        if (!location.hash) {
          if (window.jQuery.featherlight.current()) {
            window.jQuery.featherlight.current().close();
          }
        }
      }

      // Make the fullscreen gallery active.
      window.jQuery.featherlight(self.element, {
        type: 'html',
        variant: 'gallery-featherlight',
        afterContent: function() {
          log.info('initialize new instance');
          self.element.classList.remove('is-inactive');
          self.element.classList.add('is-active');
          self.active = true;
          self.createSwiperInstance();
          window.addEventListener('hashchange', onhashchange);
        },
        afterClose: function() {
          self.active = false;
          self.element.classList.add('is-inactive');
          self.element.classList.remove('is-active');

          // Remove the slide hash from URL.
          history.replaceState(undefined, undefined, window.location.pathname);
          window.removeEventListener('hashchange', onhashchange);
        }
      });
    }
  }

  /**
   * Create swiper instances & setup event handler.
   */
  createSwiperInstance() {
    // We need to set a fixed height on the slider so it can calculate
    // meaningful measurements.
    this.fixVerticalContainerHeight();

    this.swiper = new Swiper(this.swiperContainer, this.config);
    this.swiperThumb = new Swiper(this.swiperThumbContainer, this.thumbConfig);
    this.swiperThumb.controller.control = this.swiper;
    this.swiper.controller.control = this.swiperThumb;

    log.info('create swiper instance ' + this.swiper.params.direction);

    // Initialize ad handler for ad_entity module.
    this.adHandler.init(this.swiper, Gallery.isMobile());

    // Ensure the hash of the first slide is written once enabled in fullscreen.
    this.swiper.hashNavigation.setHash();

    // Track page impression of first slide.
    GalleryPI.trackNewPageImpression();
  }

  /**
   * Fix heights of slides.
   */
  fixSlideHeights() {
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

    let featherlightContent = document.querySelector('.featherlight-content');
    featherlightContent.removeAttribute('style');

    // Calculate width and height of featherligt gallery content area.
    let galleryHeightWidth = Gallery.calculateGalleryImageHeightWidth([windowheight, windowwidth]);

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

    // Available width of a gallery image is the remaining width of the gallery
    // content area minus padding of image area.
    let boxImageWidth = galleryHeightWidth.width - flPaddingLeftRight;

    // Convert the HTML Collection to an array.
    images = [...images];

    images.forEach((image, index) => {
      // Unset image styles
      image.removeAttribute('style');
      image.parentElement.removeAttribute('style');

      let imageWrapper = image.closest('.media-image');
      if (Gallery.isMobile()) {
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
        Gallery.fixImageHeightsWidth(image, availableImageHeight, boxImageWidth);
      }
    }, this);

    // Must be done after image slides are updated, so that we have the actual
    // size of the slides.
    if (!Gallery.isMobile()) {
      const firstSlide = this.content.querySelector('.swiper-wrapper').querySelector('.gallery-slide[data-swiper-slide-index="0"]:not(.swiper-slide-duplicate)');
      const firstSlideHeight = firstSlide.offsetHeight;
      this.getSlidesByType('breaker').forEach(function (slide) {
        slide.style.height = firstSlideHeight + 'px';
      });
    }
  }

  /**
   * Fix container height for vertical scrolling on mobile.
   */
  fixVerticalContainerHeight() {
    if (Gallery.isMobile()) {
      const featherlightHeight = document.querySelector('.featherlight').clientHeight;
      this.swiperContainer.style.setProperty('height', featherlightHeight + 'px');
    }
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
  static calculateGalleryImageHeightWidth(heightwidth) {
    const featherlightContent = document.querySelector('.featherlight-content');
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
  static fixImageHeightsWidth (image, availableImageHeight, boxImageWidth) {
    const boxImageHeight = availableImageHeight - (parseInt(image.closest('.media-image').offsetHeight, 10) - parseInt(image.offsetHeight, 10));

    // Remove possible padding to image.
    image.parentElement.style.removeProperty('padding-top');
    image.parentElement.style.removeProperty('padding-bottom');

    // First check if original image width and height is smaller than the
    // bounding box. In that case set the width and height to the image's
    // original width and height.
    const imageHeight = image.getAttribute('height');
    const imageWidth = image.getAttribute('width');

    let newHeight = 'inherit';
    let newWidth = 'inherit';

    if (imageHeight <= boxImageHeight && imageWidth <= boxImageWidth) {
      // In case the image height or width could not be calculated when
      // initializing the gallery set initial width and height of the bounding
      // box to the image.

      if (imageWidth === 0 || imageHeight === 0) {
        newHeight = boxImageHeight + 'px';
        newWidth = 'inherit';
      }
      else {
        newHeight = imageHeight + 'px';
        newWidth = imageWidth + 'px';

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
        newHeight = imageCalculatedHeight + 'px';
        newWidth = imageCalculatedWidth + 'px';

        let paddingTopBottom = (boxImageHeight - imageCalculatedHeight) / 2;
        image.parentElement.style.setProperty('padding-top', paddingTopBottom + 'px');
        image.parentElement.style.setProperty('padding-bottom', paddingTopBottom + 'px');
      }
      else {
        // Height of calculated image is larger than bounding box height.
        if (imageCalculatedHeight >= boxImageHeight) {
          newHeight = boxImageHeight + 'px';
          newWidth = 'inherit';
        }
        else {
          newHeight = 'inherit';
          newWidth = boxImageWidth + 'px';
        }
      }
    }

    image.style.height = newHeight;
    image.style.width = newWidth;
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
    const self = this;

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
   * Prevent swipe on button.
   *
   * @param {string} buttonClass
   */
  preventSwipeOnButton(buttonClass) {
    const stopPropagation = (e) => {
      e.stopPropagation();
    };
    const button = this.swiperContainer.querySelector(buttonClass);
    button.addEventListener('mouseDown', stopPropagation);
    button.addEventListener('touchstart', stopPropagation);
  }

  /**
   * Mobile break applies.
   *
   * @returns {boolean}
   */
  static isMobile() {
    return window.innerWidth <= Gallery.mobileBreakpoint;
  }

  /**
   * Gets slides with a specific type.
   *
   * @returns {Array}
   */
  getSlidesByType(type) {
    if (typeof(this.swiper) === "undefined") {
      return [];
    }
    const slides = [];
    [].forEach.call(this.swiper.slides, function(slide) {
      if (slide.classList.contains('swiper-slide-' + type)) {
        slides.push(slide);
      }
    });
    return slides;
  }

  /**
   * Gets the hash of the current slide.
   *
   * @returns {string|boolean} The hash or false if not found.
   */
  getSlideHash() {
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);

      // If the element has the slide with the given ID, launch it.
      if (hash && hash.startsWith(this.slideIdPrefix) && this.element.querySelectorAll("[data-hash='" + hash + "']").length) {
        return hash;
      }
    }
    return false;
  }

  /**
   * On resize event handler (already debounced).
   */
  onResize() {
    if (!this.active) {
      return;
    }

    this.fixSlideHeights();
    this.fixVerticalContainerHeight();
    this.hideAddressBar();
    this.swiper.update(true);
  }

  /**
   * On orientation change event handler (already debounced).
   */
  onOrientationChange() {
    if (!this.active) {
      return;
    }

    this.initFeatherlight();
    this.swiper.update(true);
  }

}

export default Gallery;
