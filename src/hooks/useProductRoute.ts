import { useCallback } from 'react'
import { useLocation, useMatch, useNavigate } from 'react-router-dom'
import type { Product } from '../api/products'

// Товар вложен в путь своей категории: /category/:slug/:productSlug
export const PRODUCT_ROUTE_PATTERN = '/category/:slug/:productSlug'

export type ProductRouteState = {
  // Уже загруженный товар — чтобы при клике не ходить в сеть повторно.
  product?: Product
}

export function productPath(categorySlug: string, productSlug: string): string {
  return `/category/${encodeURIComponent(categorySlug)}/${encodeURIComponent(productSlug)}`
}

/**
 * Закрывает карточку сменой URL — модалку погасит ProductModalRoute при размонтировании.
 * Если товар открыли кликом с сайта (в истории есть куда вернуться) — шаг назад,
 * это сохраняет скролл и позицию в категории. Если пришли по прямой ссылке —
 * истории нет, уходим на страницу категории.
 */
export function useCloseProduct() {
  const navigate = useNavigate()
  const location = useLocation()
  const match = useMatch(PRODUCT_ROUTE_PATTERN)

  return useCallback(() => {
    const cameFromSite = Boolean((location.state as ProductRouteState | null)?.product)
    if (cameFromSite) {
      navigate(-1)
      return
    }
    const categorySlug = match?.params.slug
    navigate(categorySlug ? `/category/${categorySlug}` : '/catalog', { replace: true })
  }, [location.state, match, navigate])
}
