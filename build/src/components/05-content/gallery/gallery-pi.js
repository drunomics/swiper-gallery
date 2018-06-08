import log from 'loglevel';

/**
 * React on new page impressions due to hash changes, like gallerie slides.
 */
window.addEventListener("hashchange", () => {
  GalleryPI.trackNewPageImpression();
});

/**
 * Allows for tracking further page impressions.
 */
class GalleryPI {

  /**
   * Tracks a page impression as defined by the global window object.
   */
  static trackNewPageImpression() {
    // Prevent triggering of the same hash when changing orientation or in
    // mobile view swiping of slides but not actually chaning the hash.
    if (this._lastTrackedHash == window.location.hash) {
      return;
    }

    this._lastTrackedHash = window.location.hash;
    log.info('URL fragment changed to ' + window.location.hash);

    // Provide the new page impression to google tag manager.
    if (typeof dataLayer !== 'undefined') {
      log.info('Google Tag Manager triggered with ' + window.location.href);
      dataLayer.push({
        'event': 'VirtualPageview',
        'virtualPageURL': window.location.href,
      });
    }
    // Call IVW again.
    if ((typeof window.iom !== 'undefined') && (typeof window.iom.c === 'function')) {
      log.info('IVW triggered');
      iom.c(iam_data, 1);
    }
  }
}

export default GalleryPI;
