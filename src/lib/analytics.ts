// Аналитика: цели Метрики (reachGoal) + e-commerce события для Метрики
// (dataLayer) и GA4 (gtag). Сами счётчики подключены в index.html.

import type { Product } from '../api/products'
import type { CartItem } from '../contexts/CartContext'

// ─── ID счётчиков ───────────────────────────────────────
// Должны совпадать с ID в index.html.
export const YM_ID = 109368038      // номер счётчика Яндекс.Метрики
export const GA_ID = 'G-TPN1XT7ESK' // ID потока Google Analytics

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

// Товар в формате ecommerce-контейнера Метрики.
type EcomProduct = {
  id: string
  name: string
  price: number
  category?: string
  quantity?: number
}

function fromProduct(p: Product, quantity?: number): EcomProduct {
  return {
    id: p.slug,
    name: p.title,
    price: p.discount_price_rub ?? p.price_rub,
    category: p.categories[0],
    quantity,
  }
}

// В CartItem нет категории, поэтому в корзинных событиях она не передаётся.
function fromCartItem(it: CartItem, quantity: number): EcomProduct {
  return { id: it.slug, name: it.title, price: it.price_rub, quantity }
}

/**
 * Цель Метрики. Идентификаторы должны быть заведены в кабинете счётчика
 * как цели типа «JavaScript-событие» — иначе вызов молча игнорируется.
 */
export function ymGoal(goal: string, params?: Record<string, unknown>) {
  if (typeof window.ym === 'function') window.ym(YM_ID, 'reachGoal', goal, params)
}

// Метрика читает пуши с ключом ecommerce из window.dataLayer
// (параметр ecommerce: "dataLayer" в init счётчика).
function ymEcommerce(action: 'detail' | 'add' | 'remove' | 'purchase', payload: Record<string, unknown>) {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ ecommerce: { currencyCode: 'RUB', [action]: payload } })
}

function gaEvent(name: string, params: Record<string, unknown>) {
  if (typeof window.gtag === 'function') window.gtag('event', name, params)
}

function toGaItems(products: EcomProduct[]) {
  return products.map((p) => ({
    item_id: p.id,
    item_name: p.name,
    price: p.price,
    item_category: p.category,
    quantity: p.quantity ?? 1,
  }))
}

/** Просмотр карточки товара. */
export function trackProductView(product: Product) {
  const item = fromProduct(product)
  ymEcommerce('detail', { products: [item] })
  gaEvent('view_item', { currency: 'RUB', value: item.price, items: toGaItems([item]) })
}

/** Добавление в корзину из карточки товара — с целью add_to_cart. */
export function trackAddToCart(product: Product, quantity: number) {
  const item = fromProduct(product, quantity)
  ymEcommerce('add', { products: [item] })
  ymGoal('add_to_cart')
  gaEvent('add_to_cart', { currency: 'RUB', value: item.price * quantity, items: toGaItems([item]) })
}

/** Кнопки «+»/«−» в корзине: изменение количества на единицу, без цели. */
export function trackCartQuantity(item: CartItem, delta: 1 | -1) {
  const one = fromCartItem(item, 1)
  if (delta > 0) {
    ymEcommerce('add', { products: [one] })
    gaEvent('add_to_cart', { currency: 'RUB', value: one.price, items: toGaItems([one]) })
  } else {
    ymEcommerce('remove', { products: [one] })
    gaEvent('remove_from_cart', { currency: 'RUB', value: one.price, items: toGaItems([one]) })
  }
}

/** Удаление позиции из корзины целиком (крестик). */
export function trackRemoveFromCart(item: CartItem) {
  const removed = fromCartItem(item, item.quantity)
  ymEcommerce('remove', { products: [removed] })
  gaEvent('remove_from_cart', { currency: 'RUB', value: removed.price * item.quantity, items: toGaItems([removed]) })
}

/** Открытие корзины с товарами — начало оформления. */
export function trackBeginCheckout(items: CartItem[], totalRub: number) {
  ymGoal('begin_checkout')
  gaEvent('begin_checkout', {
    currency: 'RUB',
    value: totalRub,
    items: toGaItems(items.map((it) => fromCartItem(it, it.quantity))),
  })
}

// ─── Покупка ────────────────────────────────────────────
// purchase шлём на /payment/success, но к этому моменту корзина уже очищена,
// поэтому перед редиректом на Робокассу сохраняем снапшот заказа в localStorage.
// Отправленные inv_id тоже запоминаем — перезагрузка success-страницы
// не должна задваивать покупку.

const PENDING_ORDER_KEY = 'businitti.analytics.pending_order'
const SENT_PURCHASES_KEY = 'businitti.analytics.sent_purchases'

type PendingOrder = {
  invId: string
  products: EcomProduct[]
  revenue: number // итог с доставкой — столько списывает Робокасса
}

/** Заказ создан, уходим на оплату: цель order_created + снапшот для purchase. */
export function trackOrderCreated(invId: number, items: CartItem[], totalRub: number) {
  ymGoal('order_created', { order_price: totalRub, currency: 'RUB' })
  const pending: PendingOrder = {
    invId: String(invId),
    products: items.map((it) => fromCartItem(it, it.quantity)),
    revenue: totalRub,
  }
  try {
    localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(pending))
  } catch { /* приватный режим — не будет ecommerce purchase, только цель */ }
}

function loadSentPurchases(): string[] {
  try {
    const data = JSON.parse(localStorage.getItem(SENT_PURCHASES_KEY) || '[]')
    return Array.isArray(data) ? data.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

/**
 * Успешная оплата: цель purchase + e-commerce purchase по снапшоту заказа.
 * Без снапшота (оплату завершили в другом браузере) шлём только цель.
 */
export function trackPurchase(invId: string) {
  const sent = loadSentPurchases()
  if (sent.includes(invId)) return

  let pending: PendingOrder | null = null
  try {
    const raw = localStorage.getItem(PENDING_ORDER_KEY)
    if (raw) pending = JSON.parse(raw)
  } catch { /* битый снапшот — шлём только цель */ }

  const matched = pending && pending.invId === invId && Array.isArray(pending.products)
  if (matched) {
    ymEcommerce('purchase', {
      actionField: { id: invId, revenue: pending!.revenue },
      products: pending!.products,
    })
    gaEvent('purchase', {
      transaction_id: invId,
      currency: 'RUB',
      value: pending!.revenue,
      items: toGaItems(pending!.products),
    })
    try { localStorage.removeItem(PENDING_ORDER_KEY) } catch { /* ignore */ }
  }

  ymGoal('purchase', matched ? { order_price: pending!.revenue, currency: 'RUB' } : undefined)

  try {
    localStorage.setItem(SENT_PURCHASES_KEY, JSON.stringify([...sent, invId].slice(-20)))
  } catch { /* ignore */ }
}
