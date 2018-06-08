/**
 * Swiper gallery breakpoints handler.
 *
 * @constructor
 */
export function SwiperGalleryBreakpoints() {

  this.TABLET = 534;
  this.TABLET_MEDIUM = 640;
  this.DESKTOP = 1021;

  /**
   * If the page is mobile.
   *
   * @returns {boolean}
   */
  this.isMobile = function() {
    return this.getWindowWidth() < this.TABLET;
  };

  /**
   * If the page is tablet.
   *
   * @returns {boolean}
   */
  this.isTablet = function() {
    return this.getWindowWidth() >= this.TABLET && this.getWindowWidth() < this.DESKTOP;
  };

  /**
   * If the page is a small tablet.
   *
   * @returns {boolean}
   */
  this.isTabletSmall = function() {
    return this.getWindowWidth() >= this.TABLET && this.getWindowWidth() < this.TABLET_MEDIUM;
  };

  /**
   * If the page is a medium tablet.
   *
   * @returns {boolean}
   */
  this.isTabletMedium = function() {
    return this.getWindowWidth() >= this.TABLET_MEDIUM && this.getWindowWidth() < this.DESKTOP;
  };

  /**
   * If the page is desktop.
   *
   * @returns {boolean}
   */
  this.isDesktop = function() {
    return this.getWindowWidth() >= this.DESKTOP;
  };

  /**
   * Gets window width.
   *
   * @returns {int}
   *   Gets window width in pixels.
   */
  this.getWindowWidth = function() {
    return window.innerWidth;
  }

  /**
   * Whether page is visitied via a mobile device.
   *
   * @return {boolean}
   */
  this.isMobileDevice = function () {
    return (/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent));
  }

}
