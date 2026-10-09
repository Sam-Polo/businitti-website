// Выбор посетителя в cookie-баннере (src/components/CookieBanner.tsx).
// Хранится в localStorage, чтобы баннер не спрашивал на каждом заходе.
// Метрика и GA4 подключаются только при 'accepted' — см. loadAnalytics() в analytics.ts.
// Если политика cookie изменится по существу — поднять версию ключа,
// и все посетители увидят баннер заново.

export type CookieConsent = 'accepted' | 'declined'

const STORAGE_KEY = 'businitti.cookie-consent.v1'

/** Сохранённый выбор или null, если посетитель ещё не отвечал (или хранилище недоступно). */
export function readCookieConsent(): CookieConsent | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'accepted' || value === 'declined' ? value : null
  } catch {
    return null
  }
}

export function saveCookieConsent(choice: CookieConsent) {
  try {
    localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    // приватный режим / переполнение — баннер просто спросит снова при следующем заходе
  }
}
