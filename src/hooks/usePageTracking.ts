import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
  }
}

// ─── ID счётчиков ───────────────────────────────────────
// Заполнить после регистрации в Яндекс.Метрике и Google Analytics.
// Должны совпадать с ID в index.html.
const YM_ID = 0   // номер счётчика Яндекс.Метрики, напр. 99887766
const GA_ID = ''  // ID потока Google Analytics, напр. 'G-XXXXXXXXXX'

/**
 * Отправляет просмотр страницы в Метрику и GA при каждой смене роута.
 * Нужно потому что сайт — SPA: без этого счётчики засчитают только
 * первый заход, а переходы между страницами останутся невидимыми.
 */
export function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    const url = location.pathname + location.search

    if (YM_ID && typeof window.ym === 'function') {
      window.ym(YM_ID, 'hit', url)
    }
    if (GA_ID && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: url })
    }
  }, [location])
}
