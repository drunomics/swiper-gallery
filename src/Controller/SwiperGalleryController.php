<?php

namespace Drupal\swiper_gallery\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Gallery controller.
 */
class SwiperGalleryController extends ControllerBase {

  /**
   * Gets the loading icon.
   *
   * The loading icon can be configured via the swiper_gallery settings.
   *
   * @return BinaryFileResponse
   */
  public function getLoadingIcon() {
    $settings = $this->config('swiper_gallery.settings');
    $loading_icon = $settings->get('loading_icon');
    $file = drupal_get_path($loading_icon['type'], $loading_icon['name']) . $loading_icon['path'];

    if (!is_readable($file)) {
      throw new NotFoundHttpException();
    }

    return new BinaryFileResponse($file);
  }

}
