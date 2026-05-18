/*
 * External links configuration
 *
 * Дефолтные значения и хук useExternalLinks(), который накладывает
 * переопределения из админки (раздел «Ссылки»). Базовые поля — фолбэк
 * на случай, если бэкенд недоступен или ключ не задан.
 */

import { useSiteContentMap } from '../contexts/SiteContentContext'

export const externalLinks = {
  // Telegram-канал бренда
  telegram: 'https://t.me/businitti',
  // Иконка/ссылка MAX в шапке/футере (alt="MAX")
  max: 'https://max.ru/join/RlegUdqmUh_wtK8TzeX0DiMp2GWy24KsfGBQzzpZurY',
  // Поддержка — Telegram-диалог
  support: 'https://t.me/aalyabeva',

  // Телефон — display показывается пользователю, tel — для href dial-link.
  // В админке поле одно: вводится display, tel генерируется автоматически.
  phoneDisplay: '8(903)009-46-55',
  phoneTel: 'tel:+79030094655',

  // Юридические документы
  offer: 'https://docs.google.com/document/d/1OcVT6PUUYYsxfYnuevi5C-HkD1KTaHlLULyfEryycEw/edit?usp=sharing',
  privacy: 'https://docs.google.com/document/d/1c8xVypvY3bue7uR5wYtYNz-S7g-tpFAXnSdlrwjCi_g/edit?usp=sharing',

  // Кнопка в блоке «Контакты» (главная, страница категории, страница «Контакты»).
  // По умолчанию ведёт туда же, куда max — но это отдельный слот, чтобы можно было
  // указать прямую ссылку в чат без смены ссылки на иконку MAX.
  contactsCtaUrl: 'https://max.ru/join/RlegUdqmUh_wtK8TzeX0DiMp2GWy24KsfGBQzzpZurY',
  contactsCtaLabel: 'MAX',
} as const

/** Превращает phoneDisplay → `tel:+71234567890` (только цифры, 8 заменяется на 7) */
export function phoneToTel(display: string): string {
  const digits = (display || '').replace(/\D/g, '')
  if (!digits) return ''
  const normalized = digits.startsWith('8') ? '7' + digits.slice(1) : digits
  return `tel:+${normalized}`
}

/**
 * Хук возвращает объект тех же ключей, что и externalLinks, но c переопределениями
 * из админки. Используйте в компонентах вместо импорта константы.
 */
export function useExternalLinks() {
  const content = useSiteContentMap()
  const phone = content['links.phone'] || externalLinks.phoneDisplay
  return {
    telegram: content['links.telegram'] || externalLinks.telegram,
    max: content['links.max'] || externalLinks.max,
    support: content['links.support'] || externalLinks.support,
    phoneDisplay: phone,
    phoneTel: phoneToTel(phone) || externalLinks.phoneTel,
    offer: content['links.offer'] || externalLinks.offer,
    privacy: content['links.privacy'] || externalLinks.privacy,
    contactsCtaUrl: content['links.cta_contacts_url'] || externalLinks.contactsCtaUrl,
    contactsCtaLabel: content['links.cta_contacts_label'] || externalLinks.contactsCtaLabel,
  }
}
