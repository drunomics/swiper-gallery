import 'swiper/dist/js/swiper.js';
import 'featherlight/release/featherlight.min';
import log from 'loglevel';
import { debounce } from 'underscore';
import GalleryPI from './gallery-pi';
import GalleryAds from './gallery-ads';

// Limit smaller than 200 can trigger flickering behavior when resizing the
// gallery.
let debounce_limit = 200;
let mobile_breakpoint = 534;

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
          break;
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

    // Set default config and show it.
    this.config = this.defaultConfig;
    this.thumbConfig = this.defaultThumbConfig;

    this.alreadyOpened = false;
  }

  /**
   * Mobile break.
   *
   * @returns {boolean}
   */
  isMobile() {
    return window.innerWidth < mobile_breakpoint;
  }

  /**
   * Gets slides with a specific type.
   *
   * @returns {Array}
   */
  getSlidesByType(type) {
    let slides = [];
    [].forEach.call(this.swiper.slides, function(slide) {
      if (slide.classList.contains('swiper-slide-' + type)) {
        slides.push(slide);
      }
    });
    return slides;
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
  fixImageHeightsWidth (image, availableImageHeight, boxImageWidth) {
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

      if (this.isMobile()) {
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
        this.fixImageHeightsWidth(image, availableImageHeight, boxImageWidth);
      }
    }, this);

    // Must be done after image slides are updated, so that we have the actual
    // size of the slides.
    this.fixBreakerSlideHeights();
  }

  /**
   * Fixes height of breaker slides.
   */
  fixBreakerSlideHeights() {
    if (this.isMobile()) {
      return;
    }
    const firstSlide = this.content.querySelector('.swiper-wrapper').querySelector('.gallery-slide[data-swiper-slide-index="0"]:not(.swiper-slide-duplicate)');
    const firstSlideHeight = firstSlide.offsetHeight;
    this.getSlidesByType('breaker').forEach(function (slide, index) {
      slide.style.height = firstSlideHeight + 'px';
    });
  }

  /**
   * Fix container height for vertical scrolling on mobile.
   */
  fixMobileContainerHeight() {
    if (!this.isMobile()) {
      return;
    }
    this.swiperContainer.style.setProperty('height', document.querySelector('.featherlight').clientHeight + 'px');
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

    this.init();
    this.fixSlideHeights();
    this.swiper.update(true);

    // If browser is resized calculate image and container height (and width).
    window.addEventListener('resize', debounce(this.onResize.bind(this), debounce_limit));

    // If we change orientation we have to create new swiper instance as gallery
    // slide widths are not updates by Swiper in the same way as on a resize
    // event. This problem occurs when the gallery is already in landscape
    // format.
    window.addEventListener('orientationchange', debounce(this.onOrientationChange.bind(this), debounce_limit));

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
   * Initializes the config dependent on the currently active breakpoints.
   */
  initSwiperConfig() {
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
  init() {
    let self = this;

    if (this.active) {
      // Do not delete swiper instances as swiper resize events might fire
      // later than our enquire.js resize events. To prevent errors, we kust
      // keep them around but detach them.
      this.swiperThumb.destroy(false, true);
      this.swiper.destroy(false, true);
      this.createSwiperInstance();
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
          self.createSwiperInstance();
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

  createSwiperInstance() {
    log.info('-- creating swiper instance for: ' + this.type);
    this.initSwiperConfig();
    this.swiper = new Swiper(this.swiperContainer, this.config);

    this.adHandler.init(this.swiper, this.isMobile());
    // Ensure the hash of the first slide is written once enabled in
    // fullscreen.
    this.swiper.hashnav.setHash();
    // Track page impression of first slide.
    GalleryPI.trackNewPageImpression();

    this.swiperThumb = new Swiper(this.swiperThumbContainer, this.thumbConfig);
    this.swiperThumb.params.control = this.swiper;
    this.swiper.params.control = this.swiperThumb;

    this.registerGalleryPageImpressionEventHandler();

    // Update swiper gallery on image load
    // to avoid issues with container height.
    this.swiper.on('onLazyImageLoad', (swiper) => {
      swiper.update();
    })

    this.swiper.on('onLazyImageReady', (swiper) => {
      swiper.update();
    })
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

  /**
   * Gets the hash of the current slide.
   *
   * @returns {string|boolean} The hash or false if not found.
   */
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

  /**
   * On resize event handler (already debounced).
   */
  onResize() {
    if (!this.active) {
      return;
    }

    this.fixSlideHeights();
    this.fixMobileContainerHeight();
    this.hideAddressBar();

    this.swiper.update(true);
    this.swiper.updateContainerSize();
    this.swiper.updateSlidesSize();
  }

  /**
   * On orientation change event handler (already debounced).
   */
  onOrientationChange() {
    if (!this.active) {
      return;
    }

    this.init();

    this.swiper.update(true);
    this.swiper.updateContainerSize();
    this.swiper.updateSlidesSize();
  }

}

export default Gallery;
