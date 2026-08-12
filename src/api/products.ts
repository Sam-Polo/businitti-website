// API-клиент сайта для публичных эндпоинтов админ-бэкенда

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'https://admin.businitti.ru'

export type Product = {
  id?: string
  slug: string
  title: string
  description?: string
  categories: string[]
  price_rub: number
  discount_price_rub?: number
  images: string[]
  article?: string
  /** остаток — приходит только если он отслеживается в админке (иначе ручная сборка) */
  stock?: number
  /** остаток кончился (0) — товар доступен только по предзаказу */
  preorder?: boolean
}

/**
 * Сколько ещё можно положить в корзину.
 * Предзаказ и товары без учёта остатка (ручная сборка) не ограничены.
 */
export function availableStock(product: Pick<Product, 'stock' | 'preorder'>): number {
  if (product.preorder || typeof product.stock !== 'number') return Infinity
  return Math.max(0, product.stock)
}

export async function fetchProductsByCategory(category: string): Promise<Product[]> {
  const url = `${API_BASE}/api/public/products?category=${encodeURIComponent(category)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`failed_to_load_products: ${res.status}`)
  const data = await res.json()
  return data.products as Product[]
}

export async function fetchProductBySlug(slug: string): Promise<Product> {
  const url = `${API_BASE}/api/public/products/${encodeURIComponent(slug)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`failed_to_load_product: ${res.status}`)
  const data = await res.json()
  return data.product as Product
}

export function formatPrice(rub: number): string {
  return `${rub.toLocaleString('ru-RU')} ₽`
}
