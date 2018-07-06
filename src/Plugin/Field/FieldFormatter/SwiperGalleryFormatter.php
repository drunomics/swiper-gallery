<?php

namespace Drupal\swiper_gallery\Plugin\Field\FieldFormatter;

use Drupal\Core\Cache\CacheableMetadata;
use Drupal\Core\Entity\EntityDisplayRepositoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\Plugin\Field\FieldFormatter\EntityReferenceFormatterBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Plugin implementation of the 'swiper_gallery' formatter.
 *
 * @FieldFormatter(
 *   id = "swiper_gallery",
 *   label = @Translation("Swiper Gallery"),
 *   description = @Translation("Display the referenced entities as a Swiper Gallery."),
 *   field_types = {
 *     "entity_reference"
 *   }
 * )
 */
class SwiperGalleryFormatter extends EntityReferenceFormatterBase implements ContainerFactoryPluginInterface {

  /**
   * Entity type manager.
   *
   * @var \Drupal\Core\Entity\EntityTypeManagerInterface
   */
  protected $entityTypeManager;

  /**
   * Entity display repository.
   *
   * @var \Drupal\Core\Entity\EntityDisplayRepositoryInterface
   */
  protected $entityDisplayRepository;

  /**
   * Media view builder.
   *
   * @var \Drupal\Core\Entity\EntityViewBuilderInterface
   */
  protected $viewBuilder;

  /**
   * Module handler.
   *
   * @var \Drupal\Core\Extension\ModuleHandlerInterface
   */
  protected $moduleHandler;

  /**
   * The media gallery.
   *
   * @var \Drupal\media\Entity\Media
   */
  protected $gallery;

  /**
   * {@inheritdoc}
   */
  public function __construct(
    $plugin_id,
    $plugin_definition,
    FieldDefinitionInterface $field_definition,
    array $settings,
    $label,
    $view_mode,
    array $third_party_settings,
    ModuleHandlerInterface $module_handler,
    EntityTypeManagerInterface $entity_type_manager,
    EntityDisplayRepositoryInterface $entity_display_repository
  ) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $label, $view_mode, $third_party_settings);
    $this->moduleHandler = $module_handler;
    $this->entityTypeManager = $entity_type_manager;
    $this->viewBuilder = $this->entityTypeManager->getViewBuilder('media');
    $this->entityDisplayRepository = $entity_display_repository;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $plugin_id,
      $plugin_definition,
      $configuration['field_definition'],
      $configuration['settings'],
      $configuration['label'],
      $configuration['view_mode'],
      $configuration['third_party_settings'],
      $container->get('module_handler'),
      $container->get('entity_type.manager'),
      $container->get('entity_display.repository')
    );
  }

  /**
   * {@inheritdoc}
   */
  public static function isApplicable(FieldDefinitionInterface $field_definition) {
    $storage = $field_definition->getFieldStorageDefinition();
    return $storage->isMultiple() && $storage->getSetting('target_type') == 'media';
  }

  /**
   * {@inheritdoc}
   */
  public static function defaultSettings() {
    return [
      'launcher_main_text' => 'Start gallery',
      'launcher_footer_text' => 'Show all',
      'show_preview_headline' => FALSE,
      'preview_type' => 'thumbs',
      'image_style_preview_image' => 'swiper_gallery_preview',
      'image_style_preview_thumbnail' => 'swiper_gallery_preview_thumbnail',
      'image_style_gallery_thumbnail' => 'swiper_gallery_thumbnail',
      'view_mode_gallery_preview' => 'default',
      'view_mode_gallery_slide' => 'default',
      'hash_nav_replace_state' => FALSE,
    ] + parent::defaultSettings();
  }

  /**
   * {@inheritdoc}
   */
  public function settingsForm(array $form, FormStateInterface $form_state) {
    $form = parent::settingsForm($form, $form_state);

    $form['launcher_main_text'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Launcher text'),
      '#description' => $this->t('The launcher text on the preview image.'),
      '#default_value' => $this->getSetting('launcher_main_text'),
    ];

    $form['show_preview_headline'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Show preview headline'),
      '#description' => $this->t('Display a headline with title and image count of the gallery above the preview image.'),
      '#default_value' => $this->getSetting('show_preview_headline'),
    ];

    $form['launcher_footer_text'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Show all text'),
      '#description' => $this->t('The `Show all`-text when thumbnails are selected in the preview footer.'),
      '#default_value' => $this->getSetting('launcher_footer_text'),
    ];

    $form['preview_type'] = [
      '#type' => 'select',
      '#title' => $this->t('Preview type'),
      '#description' => $this->t('Select the preview type.'),
      '#default_value' => $this->getSetting('preview_type'),
      '#options' => [
        'media' => $this->t('Media viewmode (can be choseon below)'),
        'thumbs' => $this->t('Thumbnails (Preview image & first 3 thumbnails)'),
      ],
    ];

    $form['view_mode_gallery_preview'] = [
      '#type' => 'select',
      '#title' => $this->t('Image viewmode: Gallery preview'),
      '#description' => $this->t('Used if media viewmode is selected in the preview type, as well as a fallback if the gallery consists of less than 4 images.'),
      '#default_value' => $this->getSetting('view_mode_gallery_preview'),
      '#options' => $this->entityDisplayRepository->getViewModeOptionsByBundle('media', 'image'),
    ];

    $form['image_style_preview_image'] = [
      '#type' => 'select',
      '#title' => $this->t('Image style: Preview image'),
      '#description' => $this->t('Image style for the main teaser image in the preview.'),
      '#default_value' => $this->getSetting('image_style_preview_image'),
      '#options' => image_style_options(FALSE),
    ];

    $form['image_style_preview_thumbnail'] = [
      '#type' => 'select',
      '#title' => $this->t('Image style: Preview thumbnails'),
      '#description' => $this->t('Image style for the thumbnails in the preview.'),
      '#default_value' => $this->getSetting('image_style_preview_thumbnail'),
      '#options' => image_style_options(FALSE),
    ];

    $form['view_mode_gallery_slide'] = [
      '#type' => 'select',
      '#title' => $this->t('Image viewmode: Gallery slide'),
      '#default_value' => $this->getSetting('view_mode_gallery_slide'),
      '#options' => $this->entityDisplayRepository->getViewModeOptionsByBundle('media', 'image'),
    ];

    $form['image_style_gallery_thumbnail'] = [
      '#type' => 'select',
      '#title' => $this->t('Image style: Gallery thumbnails'),
      '#description' => $this->t('Image style for the thumbnails in the gallery.'),
      '#default_value' => $this->getSetting('image_style_gallery_thumbnail'),
      '#options' => image_style_options(FALSE),
    ];

    $form['hash_nav_replace_state'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Hash Navigation: replace url state'),
      '#description' => $this->t('Replace current url state with the new one instead of adding it to history when sliding through the gallery.'),
      '#default_value' => $this->getSetting('hash_nav_replace_state'),
    ];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function view(FieldItemListInterface $items, $langcode = NULL) {
    $this->gallery = $items->getEntity();
    return parent::view($items, $langcode);
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {
    /** @var \Drupal\media_entity\Entity\Media[] $entities */
    $entities = $this->getEntitiesToView($items, $langcode);
    if (empty($entities)) {
      return [];
    }

    $preview = $this->buildPreview($entities);
    $slides = $this->buildSlides($entities);
    $preview_headline = $this->buildPreviewHeadline($items->getEntity()->label(), count($entities));
    $thumbnails = $this->buildImages($entities, 'swiper_gallery_thumbnail', $this->getSetting('image_style_gallery_thumbnail'));
    $referring_paragraph = $items->getEntity()->_referringItem->getEntity();

    $build = [
      '#theme' => 'swiper_gallery',
      '#attached' => [
        'library' => [
          'swiper_gallery/swiper_gallery',
        ],
        'drupalSettings' => [
          'swiperGallery' => $this->getDrupalSettings($items),
        ],
      ],
      '#slide_id_prefix' => $this->getSlideIdPrefix(),
      '#title' => $items->getEntity()->label(),
      '#preview_headline' => $preview_headline,
      '#preview' => $preview,
      '#slides' => $slides,
      '#thumbnails' => $thumbnails,
      '#gallery_id' => $this->gallery->id(),
      '#paragraph_id' => $referring_paragraph->id(),
      '#viewmode' => $this->viewMode,
    ];

    CacheableMetadata::createFromObject($items->getEntity())->applyTo($build);
    return $build;
  }

  /**
   * Gets the build for the gallery slides.
   *
   * @param \Drupal\media_entity\Entity\Media[] $entities
   *   Media entities to render.
   *
   * @return array
   */
  protected function buildSlides(array $entities) {
    $build = [];
    $view_mode = $this->getSetting('view_mode_gallery_slide');

    foreach ($entities as $entity) {
      $media_build = $this->viewBuilder->view($entity, $view_mode);

      $build[] = [
        '#theme' => 'swiper_gallery_slide',
        '#id' => $entity->id(),
        '#media' => $media_build,
        '#slide_id_prefix' => $this->getSlideIdPrefix(),
        '#variant' => 'gallery',
      ];
    }

    return $build;
  }

  /**
   * Gets the build for the images of the gallery.
   *
   * @param \Drupal\media_entity\Entity\Media[] $entities
   *   Media entities to render.
   * @param string $theme
   *   Theme template.
   * @param string $image_style
   *   The image style to render.
   * @param string $variant
   *   Slide variant, possible values:
   *      gallery: default, shows image, description & copyright.
   *      imageonly: only show the image.
   *
   * @return array
   */
  protected function buildImages(array $entities, $theme, $image_style, $variant = 'imageonly') {
    $build = [];
    foreach ($entities as $entity) {
      $image_build = $this->viewBuilder->viewField($entity->field_image, ['label' => 'hidden']);
      $image_build[0]['#image_style'] = $image_style;

      $build[] = [
        '#theme' => $theme,
        '#id' => $entity->id(),
        '#image' => $image_build,
        '#slide_id_prefix' => $this->getSlideIdPrefix(),
        '#variant' => $variant,
      ];
    }

    return $build;
  }

  /**
   * Gets the build for the preview headline.
   *
   * @param string $title
   *   Gallery title.
   * @param int $count
   *   Image count.
   *
   * @return array
   */
  protected function buildPreviewHeadline($title, $count) {
    if (!$this->getSetting('show_preview_headline')) {
      return [];
    }

    return [
      '#theme' => 'swiper_gallery_headline',
      '#title' => $title,
      '#counter' => [
        '#type' => 'markup',
        '#markup' => $count . ' ' . ($count > 1 ? $this->t('Images') : $this->t('Image')),
      ],
    ];
  }

  /**
   * Builds the preview image with the launcher.
   *
   * @param \Drupal\media_entity\Entity\Media[] $media
   *   The media containing the image.
   *
   * @return array
   */
  protected function _buildPreview(array $media) {
    $build = $this->buildImages([$media[0]], 'swiper_gallery_preview', $this->getSetting('image_style_preview_image'));
    $build = reset($build);
    $build['#launcher_main_text'] = $this->getSetting('launcher_main_text');
    $build['#launcher_footer_text'] = $this->getSetting('launcher_footer_text');
    $build['#image_count'] = count($media);

    $footer = $this->getSetting('preview_footer');
    $build['#show_description'] = $footer == 'description';

    if ($footer == 'thumbs' && count($media) >= 4) {
      foreach (array_slice($media, 1, 3) as $thumb) {
        $build['#footer_thumbs'][] = [
          '#theme' => 'image_style',
          '#style_name' => $this->getSetting('image_style_preview_thumbnail'),
          '#uri' => $thumb->field_image->entity->uri->value,
        ];
      }
    }

    return $build;
  }

  /**
   * Builds the preview image with the launcher.
   *
   * @param \Drupal\media_entity\Entity\Media[] $media
   *   The media containing the image.
   *
   * @return array
   */
  protected function buildPreview(array $media) {
    $image_count = count($media);
    $first_image = $media[0];
    $preview_type = $this->getSetting('preview_type');
    if ($preview_type == 'thumbs' && $image_count < 4) {
      $preview_type = 'media';
    }

    $build = [
      '#theme' => 'swiper_gallery_preview',
      '#launcher_main_text' => $this->getSetting('launcher_main_text'),
      '#launcher_footer_text' => $this->getSetting('launcher_footer_text'),
      '#image_count' => count($media),
      '#media' => $this->viewBuilder->view($first_image, $this->getSetting('view_mode_gallery_preview')),
      '#preview_type' => $preview_type,
    ];

    if ($preview_type == 'thumbs') {
      $image_build = $this->viewBuilder->viewField($first_image->field_image, ['label' => 'hidden']);
      $image_build[0]['#image_style'] = $this->getSetting('image_style_preview_image');
      $build['#footer_image'] = $image_build;

      foreach (array_slice($media, 1, 3) as $thumb) {
        $build['#footer_thumbs'][] = [
          '#theme' => 'image_style',
          '#style_name' => $this->getSetting('image_style_preview_thumbnail'),
          '#uri' => $thumb->field_image->entity->uri->value,
        ];
      }
    }

    return $build;
  }

  /**
   * Generate drupal settings which will be passed to the js.
   *
   * @return array
   */
  protected function getDrupalSettings() {
    $settings_key = "gallery-{$this->viewMode}-{$this->gallery->id()}";

    $settings = [
      $settings_key => [
        'hashNavReplaceState' => (bool) $this->getSetting('hash_nav_replace_state'),
      ],
    ];

    return $settings;
  }

  /**
   * Gets the slide prefix.
   *
   * @return string
   */
  protected function getSlideIdPrefix() {
    return 'slide-' . $this->gallery->id() . '-';
  }

}
