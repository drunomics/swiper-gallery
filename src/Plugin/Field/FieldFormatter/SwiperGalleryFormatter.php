<?php

namespace Drupal\swiper_gallery\Plugin\Field\FieldFormatter;

use Drupal\Core\Block\BlockManagerInterface;
use Drupal\Core\Block\BlockPluginInterface;
use Drupal\Core\Block\Plugin\Block\Broken;
use Drupal\Core\Cache\CacheableMetadata;
use Drupal\Core\Entity\EntityDisplayRepositoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\Plugin\Field\FieldFormatter\EntityReferenceFormatterBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Plugin\ContainerFactoryPluginInterface;
use Drupal\Core\Plugin\Context\ContextRepositoryInterface;
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
   * Block manager.
   *
   * @var \Drupal\Core\Block\BlockManagerInterface
   */
  protected $blockManager;

  /**
   * Context repository.
   *
   * @var \Drupal\Core\Plugin\Context\ContextRepositoryInterface
   */
  protected $contextRepository;

  /**
   * The media gallery.
   *
   * @var \Drupal\media_entity\MediaInterface
   */
  protected $gallery;

  /**
   * The field items (media images) of the gallery.
   *
   * @var \Drupal\Core\Field\FieldItemListInterface
   */
  protected $items;

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
    EntityDisplayRepositoryInterface $entity_display_repository,
    BlockManagerInterface $block_manager,
    ContextRepositoryInterface $context_repository
  ) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $label, $view_mode, $third_party_settings);
    $this->moduleHandler = $module_handler;
    $this->entityTypeManager = $entity_type_manager;
    $this->viewBuilder = $this->entityTypeManager->getViewBuilder('media');
    $this->entityDisplayRepository = $entity_display_repository;
    $this->blockManager = $block_manager;
    $this->contextRepository = $context_repository;
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
      $container->get('entity_display.repository'),
      $container->get('plugin.manager.block'),
      $container->get('context.repository')
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
      'launcher_thumbnails_text' => 'Show all',
      'show_preview_headline' => FALSE,
      'preview_type' => 'thumbs',
      'image_style_gallery_thumbnail' => 'swiper_gallery_thumbnail',
      'view_mode_gallery_preview' => 'default',
      'view_mode_gallery_preview_with_thumbs' => 'default',
      'view_mode_gallery_preview_thumb' => 'default',
      'view_mode_gallery_slide' => 'default',
      'hash_nav_replace_state' => FALSE,
      'breaker_block' => NULL,
      'breaker_position' => 6,
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
      '#description' => $this->t('Display a headline with title and image count of the gallery above the image for media preview.'),
      '#default_value' => $this->getSetting('show_preview_headline'),
    ];

    $form['launcher_thumbnails_text'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Show all text'),
      '#description' => $this->t('The `Show all`-text when thumbnails are selected in the preview.'),
      '#default_value' => $this->getSetting('launcher_thumbnails_text'),
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
      '#description' => $this->t('Viewmode of the media in the preview. Used in Media preview type.'),
      '#default_value' => $this->getSetting('view_mode_gallery_preview'),
      '#options' => $this->entityDisplayRepository->getViewModeOptionsByBundle('media', 'image'),
    ];

    $form['view_mode_gallery_preview_with_thumbs'] = [
      '#type' => 'select',
      '#title' => $this->t('Image viewmode: Gallery preview with thumbnails'),
      '#description' => $this->t('Viewmode for the main image in the preview. Used in Thumbnails preview type.'),
      '#default_value' => $this->getSetting('view_mode_gallery_preview_with_thumbs'),
      '#options' => $this->entityDisplayRepository->getViewModeOptionsByBundle('media', 'image'),
    ];

    $form['view_mode_gallery_preview_thumb'] = [
      '#type' => 'select',
      '#title' => $this->t('Image viewmode: Preview thumbnails'),
      '#description' => $this->t('Viewmode for the thumbnails in the preview. Used in Thumbnails preview type.'),
      '#default_value' => $this->getSetting('image_style_preview_thumbnail'),
      '#options' => $this->entityDisplayRepository->getViewModeOptionsByBundle('media', 'image'),
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

    $definitions = $this->blockManager->getDefinitionsForContexts($this->contextRepository->getAvailableContexts());
    $breaker_options = [];

    foreach ($definitions as $key => $definition) {
      $breaker_options[$key] = $definition['category'] . ' - ' . $definition['admin_label'];
    }

    $form['breaker_block'] = [
      '#type' => 'select',
      '#title' => $this->t('Breaker block'),
      '#description' => $this->t('Select a custom block which will be placed in between slides, e.g.: a breaker or ad entity.'),
      '#default_value' => $this->getSetting('breaker_block'),
      '#empty_value' => '',
      '#options' => $breaker_options,
    ];

    $form['breaker_position'] = [
      '#type' => 'number',
      '#title' => $this->t('Breaker position'),
      '#description' => $this->t('Show the breaker block after every X slides.'),
      '#default_value' => $this->getSetting('breaker_position'),
      '#min' => 1,
      '#step' => 1,
    ];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function view(FieldItemListInterface $items, $langcode = NULL) {
    $this->items = $items;
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

    /** @var \Drupal\Core\Block\BlockPluginInterface $breaker_block */
    $breaker_block = $this->blockManager->createInstance($this->getSetting('breaker_block'));

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
      '#title' => $this->getLabel(),
      '#preview_headline' => $preview_headline,
      '#preview' => $preview,
      '#slides' => $this->insertBreaker($slides, $breaker_block),
      '#thumbnails' => $this->insertBreaker($thumbnails, $breaker_block, TRUE),
      '#gallery_id' => $this->gallery->id(),
      '#paragraph_id' => $referring_paragraph->id(),
      '#viewmode' => $this->viewMode,
    ];

    CacheableMetadata::createFromObject($items->getEntity())->applyTo($build);
    return $build;
  }

  /**
   * Gets the label for the gallery.
   *
   * @return string
   */
  protected function getLabel() {
    // Skip default label (which states slide count and created date.)
    $default_label = $this->gallery->getType()->getDefaultName($this->gallery);
    if ($default_label->render() == $this->gallery->label()) {
      return '';
    }

    return $this->gallery->label();
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
   * Insert a breaker into the build array.
   *
   * @param array $build
   *   The build list, where the breaker will be inserted.
   * @param \Drupal\Core\Block\BlockPluginInterface $breaker
   *   The breaker block.
   * @param bool $is_thumbnails
   *   If it is the thumbnail only an empty thumbnail will be inserted.
   *   This is needed to keep the slides in sync with the thumbnails.
   *
   * @return array
   *   The build array containing the breakers.
   */
  protected function insertBreaker(array $build, BlockPluginInterface $breaker, $is_thumbnails = FALSE) {
    $breaker_position = (int) $this->getSetting('breaker_position') - 1;
    if ($breaker instanceof Broken || $breaker_position > count($build)) {
      return $build;
    }

    $items = [];
    $i = 0;
    $break_id = 0;
    // For thumbnails, an empty slide is added to keep it in sync with the
    // number of slides for swiper to work properly.
    $breaker_build = $is_thumbnails ? '' : $breaker->build();

    foreach ($build as $build_item) {
      $i++;
      $items[] = $build_item;
      if ($i % $breaker_position == 0) {
        $items[] = [
          '#theme' => 'swiper_gallery_breaker',
          '#id' => $this->getSlideIdPrefix() . 'breaker-' . $break_id++,
          '#breaker' => $breaker_build,
          '#variant' => $is_thumbnails ? 'imageonly' : 'gallery',
        ];
      }
    }

    return $items;
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
    if ($this->getPreviewType() != 'media' || !$this->getSetting('show_preview_headline')) {
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
  protected function buildPreview(array $media) {
    $first_image = $media[0];
    $preview_type = $this->getPreviewType();

    $build = [
      '#theme' => 'swiper_gallery_preview',
      '#launcher_main_text' => $this->getSetting('launcher_main_text'),
      '#launcher_thumbnails_text' => $this->getSetting('launcher_thumbnails_text'),
      '#image_count' => count($media),
      '#media' => $this->viewBuilder->view($first_image, $this->getSetting('view_mode_gallery_preview')),
      '#preview_type' => $preview_type,
    ];

    if ($preview_type == 'thumbs') {
      $preview_thumbnails_media = $this->viewBuilder->view($first_image, $this->getSetting('view_mode_gallery_preview_with_thumbs'));
      $build['#preview_thumbnails_media'] = $preview_thumbnails_media;

      foreach (array_slice($media, 1, 3) as $thumb) {
        $thumb_media = $this->viewBuilder->view($thumb, $this->getSetting('view_mode_gallery_preview_thumb'));
        $build['#preview_thumbnails_thumbs'][] = $thumb_media;
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
   * Gets the preview type.
   *
   * @return string
   */
  protected function getPreviewType() {
    $image_count = count($this->items);
    $preview_type = $this->getSetting('preview_type');
    // Thumbs preview needs at least 4 Images, fallback to media preview.
    if ($preview_type == 'thumbs' && $image_count < 4) {
      $preview_type = 'media';
    }

    return $preview_type;
  }

  /**
   * Gets the slide prefix.
   *
   * @return string
   */
  protected function getSlideIdPrefix() {
    $paragraph = $this->gallery->_referringItem->getEntity();
    $hash = substr(md5($paragraph->id() . $this->gallery->id()), 0, 5);
    return "slide-{$hash}-";
  }

}
