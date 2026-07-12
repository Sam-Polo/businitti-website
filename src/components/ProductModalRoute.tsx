import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { fetchProductBySlug } from '../api/products'
import { useCart } from '../contexts/CartContext'
import { trackPageView } from '../hooks/usePageTracking'
import { trackProductView } from '../lib/analytics'
import type { ProductRouteState } from '../hooks/useProductRoute'

const SITE_TITLE = 'Businitti — украшения ручной работы'

/**
 * Вложенный роут /category/:slug/:productSlug. Сам ничего не рисует — открывает
 * карточку товара (модалку из MainLayout) по URL и закрывает при уходе с роута.
 * Категорию под модалкой рендерит родительский CategoryPage из того же URL.
 */
export default function ProductModalRoute() {
  const { slug: categorySlug, productSlug } = useParams<{ slug: string; productSlug: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { itemModalProduct, openItem, closeItem } = useCart()

  const preloaded = (location.state as ProductRouteState | null)?.product
  const openSlug = itemModalProduct?.slug
  const failedSlug = useRef<string | null>(null)

  // URL → открыть товар: из state мгновенно, иначе подгрузить по сети.
  useEffect(() => {
    if (!productSlug) return
    if (openSlug === productSlug || failedSlug.current === productSlug) return

    if (preloaded?.slug === productSlug) {
      openItem(preloaded)
      return
    }

    let cancelled = false
    fetchProductBySlug(productSlug)
      .then((product) => { if (!cancelled) openItem(product) })
      .catch(() => {
        // Товар удалён или ссылка битая — не оставляем пустой экран.
        if (cancelled) return
        failedSlug.current = productSlug
        navigate(categorySlug ? `/category/${categorySlug}` : '/catalog', { replace: true })
      })
    return () => { cancelled = true }
  }, [productSlug, categorySlug, openSlug, preloaded, openItem, navigate])

  // Уход с роута товара → закрыть карточку (проиграется анимация закрытия).
  useEffect(() => {
    return () => closeItem()
  }, [closeItem])

  // Заголовок вкладки восстанавливаем при закрытии карточки.
  useEffect(() => {
    return () => { document.title = SITE_TITLE }
  }, [])

  // Заголовок вкладки + просмотр в аналитике — когда известно название товара.
  const hitKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (!itemModalProduct || itemModalProduct.slug !== productSlug) return
    const title = `${itemModalProduct.title} — Businitti`
    document.title = title

    // Один хит на запись истории (location.key), без дублей при ре-рендерах.
    if (hitKeyRef.current === location.key) return
    hitKeyRef.current = location.key
    trackPageView(location.pathname + location.search, title)
    trackProductView(itemModalProduct)
  }, [itemModalProduct, productSlug, location.key, location.pathname, location.search])

  return null
}
