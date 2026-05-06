/*
 * External links configuration
 *
 * Replace placeholder URLs (`#`) with the actual targets
 * before deploying. Used by Header, Footer, MainPage, CategoryPage.
 */

export const externalLinks = {
  // Messenger / social — set the full account URL once known
  telegram: 'https://t.me/',
  whatsapp: 'https://wa.me/',
  max: 'https://t.me/',

  // Phone — `display` is shown to the user, `tel` is the dial-link
  phoneDisplay: '8(909)888-88-88',
  phoneTel: 'tel:+79098888888',

  // Legal documents (Google Docs links — to be filled in by the owner)
  offer: 'https://docs.google.com/document/d/1OcVT6PUUYYsxfYnuevi5C-HkD1KTaHlLULyfEryycEw/edit?usp=sharing',
  privacy: 'https://docs.google.com/document/d/1c8xVypvY3bue7uR5wYtYNz-S7g-tpFAXnSdlrwjCi_g/edit?usp=sharing',
} as const
