/*
 * External links configuration
 *
 * Replace placeholder URLs (`#`) with the actual targets
 * before deploying. Used by Header, Footer, MainPage, CategoryPage.
 */

export const externalLinks = {
  // Main Telegram channel/account
  telegram: 'https://t.me/businitti',
  // Direct message link for MAX and "Поддержка"
  max: 'https://max.ru/join/RlegUdqmUh_wtK8TzeX0DiMp2GWy24KsfGBQzzpZurY',
  // Support link — opens direct Telegram conversation
  support: 'https://t.me/aalyabeva',

  // Phone — `display` is shown to the user, `tel` is the dial-link
  phoneDisplay: '8(903)009-46-55',
  phoneTel: 'tel:+79030094655',

  // Legal documents (Google Docs links)
  offer: 'https://docs.google.com/document/d/1OcVT6PUUYYsxfYnuevi5C-HkD1KTaHlLULyfEryycEw/edit?usp=sharing',
  privacy: 'https://docs.google.com/document/d/1c8xVypvY3bue7uR5wYtYNz-S7g-tpFAXnSdlrwjCi_g/edit?usp=sharing',
} as const
