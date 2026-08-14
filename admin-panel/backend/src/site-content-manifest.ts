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

// оригинальные тексты — нужны и для рендера сайтом как фолбэк, и для счётчика в админке
const ORIG_HOME_CONTACTS_DESC =
  'Мы стараемся, чтобы каждая покупка приносила радость. Если вы сомневаетесь в размере или хотите увидеть дополнительные фото украшения'

const ORIG_CONTACTS_DESC = ORIG_HOME_CONTACTS_DESC

const ORIG_DELIVERY_HEADER_DESC =
  'Сборка и отправка заказа осуществляется в течение 2-5 рабочих дней с момента оформления заказа.\n\nПри оформлении заказа на сайте введите адрес ближайшего к вам пункта выдачи, из которого вам удобно будет забрать заказ.'

const ORIG_DELIVERY_PAYMENT_TEXT =
  'Все заказы оплачиваются онлайн при оформлении заказа — это быстро и безопасно через систему Robokassa.\n\nПокупателю доступны банковские карты и иные способы оплаты, предусмотренные платежной формой на момент совершения заказа.\n\nПосле успешного проведения платежа кассовый чек направляется на указанные покупателем контактные данные.'

const ORIG_GUARANTEE_RETURN =
  'Все наши изделия находятся на гарантии и подлежат ремонту, замене на аналогичное или возврату уплаченной суммы (с возвратом товара) в случае производственного дефекта (сломанный замок, разорванное звено или тросик без внешнего воздействия) в течение 14 календарных дней с момента получения заказа.\n\nТовар должен быть в оригинальном виде, без следов использования, в оригинальной упаковке.\n\nВозврат денежных средств осуществляется на ту же карту, с которой была произведена оплата в течение 10 рабочих дней.\n\nДля оформления возврата свяжитесь с менеджером.'

const ORIG_TIP_1 = 'Избегайте контакта украшений с водой, парфюмом и косметическими средствами'
const ORIG_TIP_2 = 'Берегите от воздействия прямых солнечных лучей'
const ORIG_TIP_3 = 'Храните в индивидуальной упаковке в горизонтальном положении'
const ORIG_TIP_4 = 'После носки протирайте украшения мягкой безворсовой тканью'

const ORIG_ABOUT_HERO_BUDDY =
  '[[BUSINITTI (Бусинити)]]\n\n— это авторские украшения ручной работы из натуральных камней и минералов.\n\nМы создаём не просто аксессуары, а украшения со смыслом — те, что тонко дополняют образ и становятся его продолжением.\n\nКаждое изделие может стать вашим личным символом: оберегом в непростые дни, талисманом, придающим уверенность на новом этапе, или тихим напоминанием о пути к мечте.'

const ORIG_ABOUT_GALLERY_TEXT =
  'Мы верим, что красота — это не только внешний блеск, но и внутреннее ощущение. Именно поэтому в каждое украшение мы вкладываем внимание к деталям, энергию и любовь.\n\nДавайте создавать красоту со смыслом вместе.'

const ORIG_ABOUT_CLOSING = 'С любовью к вам,\nBUSINITTI'

const ORIG_CART_NOTICE = 'Сборка и отправка заказа осуществляется в течение 2–5 дней'

// Тексты писем клиенту. Экспортируются, потому что `order-email.ts` берёт их же как фолбэк,
// когда переопределения в Sheets нет — единственный источник правды.
// `[[…]]` — розовый акцент, пустая строка — новый абзац (как в текстах на сайте).
export const ORIG_EMAIL_PAID_HEADING = 'Спасибо за заказ!'
export const ORIG_EMAIL_PAID_NOTICE =
  'Мы соберём и отправим заказ в течение [[2–5 дней]]. Когда посылка уйдёт в службу доставки — пришлём трек-номер на этот же email.'
export const ORIG_EMAIL_PAID_PREORDER_NOTICE =
  'Украшения из этого заказа мы делаем под заказ — свяжемся с вами и [[согласуем срок изготовления]]. Когда посылка уйдёт в службу доставки, пришлём трек-номер на этот же email.'
export const ORIG_EMAIL_SHIPPED_HEADING = 'Ваш заказ отправлен!'
export const ORIG_EMAIL_SHIPPED_NOTICE =
  'Обычно посылки доставляются в течение [[2–7 рабочих дней]] с момента отправки.'
export const ORIG_EMAIL_FOOTER_NOTE = 'Это автоматическое уведомление. Отвечать на него не нужно.'

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
  {
    key: 'home.contacts_desc',
    page: 'home',
    pageTitle: 'Главная',
    type: 'text',
    label: 'Текст в блоке «Контакты»',
    description: 'Над кнопкой MAX в правой части блока',
    defaultValue: ORIG_HOME_CONTACTS_DESC,
    order: 3,
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
  {
    key: 'about.hero_buddy_text',
    page: 'about',
    pageTitle: 'О бренде',
    type: 'text',
    label: 'Главный текст (слева сверху)',
    description: 'Абзацы распределяются по высоте блока',
    defaultValue: ORIG_ABOUT_HERO_BUDDY,
    order: 4,
  },
  {
    key: 'about.gallery_text',
    page: 'about',
    pageTitle: 'О бренде',
    type: 'text',
    label: 'Текст в нижнем блоке',
    defaultValue: ORIG_ABOUT_GALLERY_TEXT,
    order: 5,
  },
  {
    key: 'about.closing_text',
    page: 'about',
    pageTitle: 'О бренде',
    type: 'text',
    label: 'Подпись «С любовью к вам, BUSINITTI»',
    description: 'Короткая подпись справа внизу',
    defaultValue: ORIG_ABOUT_CLOSING,
    order: 6,
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
  {
    key: 'delivery.header_desc',
    page: 'delivery',
    pageTitle: 'Покупателям (доставка)',
    type: 'text',
    label: 'Текст под заголовком «Доставка:»',
    description: 'Несколько абзацев, разделённых пустой строкой',
    defaultValue: ORIG_DELIVERY_HEADER_DESC,
    order: 3,
  },
  {
    key: 'delivery.payment_text',
    page: 'delivery',
    pageTitle: 'Покупателям (доставка)',
    type: 'text',
    label: 'Текст в блоке «Оплата:»',
    description: 'Несколько абзацев, разделённых пустой строкой',
    defaultValue: ORIG_DELIVERY_PAYMENT_TEXT,
    order: 4,
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
  {
    key: 'contacts.desc',
    page: 'contacts',
    pageTitle: 'Контакты',
    type: 'text',
    label: 'Текст над кнопкой',
    defaultValue: ORIG_CONTACTS_DESC,
    order: 2,
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
  {
    key: 'guarantee.return_text',
    page: 'guarantee',
    pageTitle: 'Гарантия и возврат',
    type: 'text',
    label: 'Текст справа от фото',
    description: 'Абзацы автоматически распределяются по высоте блока с фото — пустая строка = новый абзац',
    defaultValue: ORIG_GUARANTEE_RETURN,
    order: 2,
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
  {
    key: 'recommendations.tip_1',
    page: 'recommendations',
    pageTitle: 'Рекомендации по уходу',
    type: 'text',
    label: 'Совет 1',
    defaultValue: ORIG_TIP_1,
    order: 2,
  },
  {
    key: 'recommendations.tip_2',
    page: 'recommendations',
    pageTitle: 'Рекомендации по уходу',
    type: 'text',
    label: 'Совет 2',
    defaultValue: ORIG_TIP_2,
    order: 3,
  },
  {
    key: 'recommendations.tip_3',
    page: 'recommendations',
    pageTitle: 'Рекомендации по уходу',
    type: 'text',
    label: 'Совет 3',
    defaultValue: ORIG_TIP_3,
    order: 4,
  },
  {
    key: 'recommendations.tip_4',
    page: 'recommendations',
    pageTitle: 'Рекомендации по уходу',
    type: 'text',
    label: 'Совет 4',
    defaultValue: ORIG_TIP_4,
    order: 5,
  },

  // ===== Оформление заказа =====
  {
    key: 'checkout.cart_notice',
    page: 'checkout',
    pageTitle: 'Оформление',
    type: 'text',
    label: 'Уведомление в окне оформления заказа',
    description: 'Текст под полем «Пожелания к заказу» в корзине',
    defaultValue: ORIG_CART_NOTICE,
    order: 1,
  },

  // ===== Письма клиенту =====
  {
    key: 'email.paid.heading',
    page: 'email',
    pageTitle: 'Письма',
    type: 'text',
    label: 'Письмо об оплате: заголовок',
    description: 'Крупная строка вверху письма, которое уходит после оплаты заказа',
    defaultValue: ORIG_EMAIL_PAID_HEADING,
    order: 1,
  },
  {
    key: 'email.paid.notice',
    page: 'email',
    pageTitle: 'Письма',
    type: 'text',
    label: 'Письмо об оплате: сроки сборки',
    description: 'Розовая плашка под составом заказа — что будет дальше и когда',
    defaultValue: ORIG_EMAIL_PAID_NOTICE,
    order: 2,
  },
  {
    key: 'email.paid.preorder_notice',
    page: 'email',
    pageTitle: 'Письма',
    type: 'text',
    label: 'Письмо об оплате: сроки для предзаказа',
    description: 'Заменяет плашку выше, если весь заказ состоит из предзаказных товаров',
    defaultValue: ORIG_EMAIL_PAID_PREORDER_NOTICE,
    order: 3,
  },
  {
    key: 'email.shipped.heading',
    page: 'email',
    pageTitle: 'Письма',
    type: 'text',
    label: 'Письмо об отправке: заголовок',
    description: 'Крупная строка вверху письма с трек-номером',
    defaultValue: ORIG_EMAIL_SHIPPED_HEADING,
    order: 4,
  },
  {
    key: 'email.shipped.notice',
    page: 'email',
    pageTitle: 'Письма',
    type: 'text',
    label: 'Письмо об отправке: сроки доставки',
    description: 'Розовая плашка под адресом доставки',
    defaultValue: ORIG_EMAIL_SHIPPED_NOTICE,
    order: 5,
  },
  {
    key: 'email.footer_note',
    page: 'email',
    pageTitle: 'Письма',
    type: 'text',
    label: 'Подпись внизу писем',
    description: 'Мелкая строка под письмом — одинаковая в обоих письмах',
    defaultValue: ORIG_EMAIL_FOOTER_NOTE,
    order: 6,
  },

  // ===== Ссылки (общие для всего сайта) =====
  {
    key: 'links.telegram',
    page: 'links',
    pageTitle: 'Ссылки',
    type: 'link',
    label: 'Telegram-канал бренда',
    description: 'Иконка Telegram в футере и в бургер-меню',
    defaultValue: 'https://t.me/businitti',
    order: 1,
  },
  {
    key: 'links.max',
    page: 'links',
    pageTitle: 'Ссылки',
    type: 'link',
    label: 'MAX (иконка в шапке/футере)',
    description: 'Кружок с буквой M в футере и в бургер-меню (alt="MAX")',
    defaultValue: 'https://max.ru/join/RlegUdqmUh_wtK8TzeX0DiMp2GWy24KsfGBQzzpZurY',
    order: 2,
  },
  {
    key: 'links.support',
    page: 'links',
    pageTitle: 'Ссылки',
    type: 'link',
    label: 'Поддержка (Telegram)',
    description: 'Ссылка «Поддержка» в шапке/футере + кнопка «Связаться» на странице «Гарантия и возврат»',
    defaultValue: 'https://t.me/aalyabeva',
    order: 3,
  },
  {
    key: 'links.phone',
    page: 'links',
    pageTitle: 'Ссылки',
    type: 'text',
    label: 'Телефон',
    description: 'Показывается в футере. Сразу становится кликабельной tel-ссылкой. Введите в любом удобном формате — пример: 8(903)009-46-55',
    defaultValue: '8(903)009-46-55',
    order: 4,
  },
  {
    key: 'links.cta_contacts_url',
    page: 'links',
    pageTitle: 'Ссылки',
    type: 'link',
    label: 'Кнопка «Контакты» — ссылка',
    description: 'Кнопка в блоке «Контакты» на главной, на странице категории и на странице «Контакты»',
    defaultValue: 'https://max.ru/join/RlegUdqmUh_wtK8TzeX0DiMp2GWy24KsfGBQzzpZurY',
    order: 5,
  },
  {
    key: 'links.cta_contacts_label',
    page: 'links',
    pageTitle: 'Ссылки',
    type: 'text',
    label: 'Кнопка «Контакты» — надпись',
    description: 'Что написано на той же кнопке (по умолчанию «MAX»)',
    defaultValue: 'MAX',
    order: 6,
  },
  {
    key: 'links.messenger',
    page: 'links',
    pageTitle: 'Ссылки',
    type: 'link',
    label: '«Написать в мессенджер» — ссылка в письме',
    description: 'Ссылка для текста «Написать в мессенджер» в письмах покупателям (подтверждение заказа и уведомление об отправке)',
    defaultValue: 'https://t.me/aalyabeva',
    order: 7,
  },
  {
    key: 'links.offer',
    page: 'links',
    pageTitle: 'Ссылки',
    type: 'link',
    label: 'Договор оферты',
    description: 'Ссылка в футере и в модалке корзины',
    defaultValue: 'https://docs.google.com/document/d/1OcVT6PUUYYsxfYnuevi5C-HkD1KTaHlLULyfEryycEw/edit?usp=sharing',
    order: 8,
  },
  {
    key: 'links.privacy',
    page: 'links',
    pageTitle: 'Ссылки',
    type: 'link',
    label: 'Политика обработки персональных данных',
    description: 'Ссылка в футере и в модалке корзины',
    defaultValue: 'https://docs.google.com/document/d/1c8xVypvY3bue7uR5wYtYNz-S7g-tpFAXnSdlrwjCi_g/edit?usp=sharing',
    order: 9,
  },
]

export function getSlotByKey(key: string): ContentSlot | undefined {
  return CONTENT_SLOTS.find((s) => s.key === key)
}
