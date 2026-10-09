import { useState } from 'react'
import { useExternalLinks } from '../config/links'
import { useModalAnimation } from '../hooks/useModalAnimation'
import { loadAnalytics } from '../lib/analytics'
import { readCookieConsent, saveCookieConsent, type CookieConsent } from '../lib/cookieConsent'
import './CookieBanner.css'

/**
 * Согласие на cookie. Висит внизу, пока посетитель не нажмёт «Принять» или «Отказаться»;
 * выбор запоминается (src/lib/cookieConsent.ts). «Принять» сразу подключает Метрику и GA4,
 * при отказе счётчики не загружаются вовсе.
 */
export default function CookieBanner() {
  const { cookies: policyUrl } = useExternalLinks()
  const [isOpen, setIsOpen] = useState(() => readCookieConsent() === null)
  const { shouldRender, isClosing } = useModalAnimation(isOpen)

  if (!shouldRender) return null

  const choose = (choice: CookieConsent) => {
    saveCookieConsent(choice)
    if (choice === 'accepted') loadAnalytics()
    setIsOpen(false)
  }

  return (
    <section className={`cookie-banner${isClosing ? ' is-closing' : ''}`} aria-label="Согласие на использование cookie">
      <p className="cookie-banner__title">Файлы cookie</p>
      <p className="cookie-banner__text">
        Мы используем технические cookie, без которых не работают сайт и корзина.
        Нажимая «Принять», вы соглашаетесь также на аналитические cookie Яндекс Метрики
        и Google Analytics — они помогают нам делать сайт удобнее.
        {policyUrl && (
          <> Подробнее — в <a href={policyUrl} target="_blank" rel="noopener noreferrer">политике использования cookie</a>.</>
        )}
      </p>
      <div className="cookie-banner__actions">
        <button type="button" className="cookie-banner__btn cookie-banner__btn--accept" onClick={() => choose('accepted')}>
          Принять
        </button>
        <button type="button" className="cookie-banner__btn" onClick={() => choose('declined')}>
          Отказаться
        </button>
      </div>
    </section>
  )
}
