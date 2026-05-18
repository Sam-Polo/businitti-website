/**
 * Манифест редактируемого контента сайта.
 *
 * Бэкенд — источник правды о наборе слотов. Sheets хранит только override-значения.
 * Если в Sheets нет строки или value пусто — фронтенд использует defaultValue (фолбэк).
 *
 * Чтобы добавить новый редактируемый элемент:
 *   1. Добавьте сюда запись с уникальным key (формата `page.slot_name`)
 *   2. Укажите page (для группировки в админке), type, label, и т.д.
 *   3. Для image: defaultValue — путь к существующей картинке в сборке сайта (фолбэк)
 *   4. На фронте сайта используйте useSiteContent(key, defaultValue)
 */

export type ContentSlotType = 'image' | 'text' | 'link'

export type ContentSlot = {
  key: string                // уникальный идентификатор, например "home.hero_image"
  page: string               // ключ страницы для группировки в админке
  pageTitle: string          // отображаемое название страницы
  type: ContentSlotType
  label: string              // что это (показывается админу)
  description?: string       // подсказка где используется
  /**
   * Дефолтное значение (используется как фолбэк, если в Sheets пусто).
   * Для image — относительный путь, который собирается фронтом сайта (см. фолбэки в коде сайта).
   */
  defaultValue?: string
  /** Подсказка про соотношение сторон / размер (показывается в админке для image-слотов) */
  hint?: string
  order: number              // порядок в админке внутри страницы
}

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
    order: 1,
  },
  {
    key: 'home.contacts_image',
    page: 'home',
    pageTitle: 'Главная',
    type: 'image',
    label: 'Контакты (фото справа в блоке «Контакты»)',
    description: 'Фото в правой части секции контактов',
    hint: 'Соотношение сторон 560 × 382',
    order: 2,
  },
]

export function getSlotByKey(key: string): ContentSlot | undefined {
  return CONTENT_SLOTS.find((s) => s.key === key)
}
