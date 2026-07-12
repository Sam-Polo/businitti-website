import { useEffect } from 'react'
import { useLocation, useMatch } from 'react-router-dom'
import { PRODUCT_ROUTE_PATTERN } from './useProductRoute'

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

// URL, с которым открыли сайт, уже посчитали счётчики в index.html
// (ym init и gtag config). Его первый показ пропускаем, чтобы не задваивать
// стартовую страницу. Повторные заходы на тот же URL уже считаем.
const initialUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''
let initialSkipped = false

/**
 * Отправляет просмотр в Метрику и GA.
 * Метрика без явного title подставит document.title, а он у SPA статичный —
 * поэтому для товаров название передаём вручную.
 */
export function trackPageView(url: string, title?: string) {
  if (!initialSkipped && url === initialUrl) {
    initialSkipped = true
    return
  }
  if (YM_ID && typeof window.ym === 'function') {
    if (title) window.ym(YM_ID, 'hit', url, { title })
    else window.ym(YM_ID, 'hit', url)
  }
  if (GA_ID && typeof window.gtag === 'function') {
    window.gtag('event', 'page_view', title ? { page_path: url, page_title: title } : { page_path: url })
  }
}

/**
 * Отправляет просмотр страницы в Метрику и GA при каждой смене роута.
 * Нужно потому что сайт — SPA: без этого счётчики засчитают только
 * первый заход, а переходы между страницами останутся невидимыми.
 *
 * Роуты товара пропускаем: их со своим названием шлёт ProductModalRoute,
 * иначе в отчётах по заголовкам все товары сольются в одну строку.
 */
export function usePageTracking() {
  const location = useLocation()
  const isProduct = Boolean(useMatch(PRODUCT_ROUTE_PATTERN))

  useEffect(() => {
    if (isProduct) return
    trackPageView(location.pathname + location.search)
  }, [location, isProduct])
}
