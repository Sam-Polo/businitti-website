import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

// ─── ID счётчиков ───────────────────────────────────────
// Должны совпадать с ID в index.html.
const YM_ID = 109368038      // номер счётчика Яндекс.Метрики
const GA_ID = 'G-TPN1XT7ESK' // ID потока Google Analytics

/**
 * Отправляет просмотр страницы в Метрику и GA при каждой смене роута.
 * Нужно потому что сайт — SPA: без этого счётчики засчитают только
 * первый заход, а переходы между страницами останутся невидимыми.
 *
 * Первый рендер пропускаем — стартовую страницу уже засчитали счётчики
 * в index.html (ym init и gtag config). Иначе landing-страница задвоится.
 */
export function usePageTracking() {
  const location = useLocation()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const url = location.pathname + location.search

    if (YM_ID && typeof window.ym === 'function') {
      window.ym(YM_ID, 'hit', url)
    }
    if (GA_ID && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: url })
    }
  }, [location])
}
