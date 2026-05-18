/**
 * Манифест редактируемого контента сайта.
 *
 * Бэкенд — источник правды о наборе слотов. Sheets хранит только override-значения.
 * Если в Sheets нет строки или value пусто — фронтенд сайта использует свой бандлированный
 * фолбэк (см. компоненты страниц). Поле defaultValue в манифесте — это **превью оригинала
 * в админке** (URL до копии в admin-frontend/public/content-defaults/).
 */

export type ContentSlotType = 'image' | 'text' | 'link'

export type ContentSlot = {
  key: string                // уникальный идентификатор, например "home.hero_image"
  page: string               // ключ страницы для группировки в админке
  pageTitle: string          // отображаемое название страницы
  type: ContentSlotType
  label: string
  description?: string
  /** URL превью оригинала, показывается в админке когда override не установлен */
  defaultValue?: string
  /** Подсказка про соотношение сторон / размер */
  hint?: string
  order: number
}

const DEFAULTS_BASE = '/content-defaults'

export const CONTENT_SLOTS: ContentSlot[] = [
  // ===== Главная =====
  {
    key: 'home.hero_image',
    page: 'home',
    pageTitle: 'Главная',
    type: 'image',
    label: 'Hero (главный баннер)',
    description: 'Большое фото вверху главной страницы',
    hint: 'Соотношение сторон 1160 × 632 (десктоп) / 328 × 422 (мобилка)',
    defaultValue: `${DEFAULTS_BASE}/hero__overlay.jpg`,
    order: 1,
  },
  {
    key: 'home.contacts_image',
    page: 'home',
    pageTitle: 'Главная',
    type: 'image',
    label: 'Контакты (фото в блоке)',
    description: 'Фото в правой части секции контактов',
    hint: 'Соотношение сторон 560 × 382',
    defaultValue: `${DEFAULTS_BASE}/home-contacts__image.png`,
    order: 2,
  },

  // ===== О бренде =====
  {
    key: 'about.hero_image',
    page: 'about',
    pageTitle: 'О бренде',
    type: 'image',
    label: 'Фото в шапке (about-hero)',
    description: 'Главное фото на странице «О бренде»',
    hint: 'Соотношение сторон 560 × 240 (десктоп) / 16:9 (мобилка)',
    defaultValue: `${DEFAULTS_BASE}/about-hero__img.jpg`,
    order: 1,
  },
  {
    key: 'about.gallery_image_1',
    page: 'about',
    pageTitle: 'О бренде',
    type: 'image',
    label: 'Галерея — фото 1',
    description: 'Левое фото в галерее',
    hint: 'Соотношение сторон 560 × 240',
    defaultValue: `${DEFAULTS_BASE}/about-gallery__img1.jpg`,
    order: 2,
  },
  {
    key: 'about.gallery_image_2',
    page: 'about',
    pageTitle: 'О бренде',
    type: 'image',
    label: 'Галерея — фото 2',
    description: 'Правое фото в галерее',
    hint: 'Соотношение сторон 560 × 240',
    defaultValue: `${DEFAULTS_BASE}/about-gallery__img2.jpg`,
    order: 3,
  },

  // ===== Внутри категории =====
  {
    key: 'category.contacts_image',
    page: 'category',
    pageTitle: 'Страница категории',
    type: 'image',
    label: 'Фото в блоке «Контакты» внизу',
    description: 'Фото показывается на всех страницах категорий товаров',
    hint: 'Соотношение сторон 560 × 382',
    defaultValue: `${DEFAULTS_BASE}/home-contacts__image.png`,
    order: 1,
  },

  // ===== Покупателям (доставка) =====
  {
    key: 'delivery.header_image',
    page: 'delivery',
    pageTitle: 'Покупателям (доставка)',
    type: 'image',
    label: 'Фото в шапке страницы',
    description: 'Большое фото справа в шапке',
    hint: 'Размер ≈ 500 × 560',
    defaultValue: `${DEFAULTS_BASE}/delivery-header__image.jpg`,
    order: 1,
  },
  {
    key: 'delivery.payment_image',
    page: 'delivery',
    pageTitle: 'Покупателям (доставка)',
    type: 'image',
    label: 'Фото в блоке «Оплата»',
    description: 'Фото слева в секции оплаты',
    hint: 'Размер ≈ 400 × 230',
    defaultValue: `${DEFAULTS_BASE}/payment-section__image.png`,
    order: 2,
  },

  // ===== Контакты =====
  {
    key: 'contacts.bg_image',
    page: 'contacts',
    pageTitle: 'Контакты',
    type: 'image',
    label: 'Фото справа',
    description: 'Фото в правой части блока контактов',
    hint: 'Соотношение сторон 560 × 382',
    defaultValue: `${DEFAULTS_BASE}/home-contacts__image.png`,
    order: 1,
  },

  // ===== Гарантия и возврат =====
  {
    key: 'guarantee.header_image',
    page: 'guarantee',
    pageTitle: 'Гарантия и возврат',
    type: 'image',
    label: 'Фото в шапке страницы',
    description: 'Фото слева в шапке',
    hint: 'Размер ≈ 419 × 360',
    defaultValue: `${DEFAULTS_BASE}/guarantee-header__image.png`,
    order: 1,
  },

  // ===== Рекомендации по уходу =====
  {
    key: 'recommendations.image',
    page: 'recommendations',
    pageTitle: 'Рекомендации по уходу',
    type: 'image',
    label: 'Главное фото страницы',
    description: 'Фото на странице рекомендаций',
    hint: 'Высота 560px (десктоп) / 202px (мобилка)',
    defaultValue: `${DEFAULTS_BASE}/recommendations-image.png`,
    order: 1,
  },
]

export function getSlotByKey(key: string): ContentSlot | undefined {
  return CONTENT_SLOTS.find((s) => s.key === key)
}
