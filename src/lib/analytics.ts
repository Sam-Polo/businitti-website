// Аналитика: подключение счётчиков (Яндекс Метрика + GA4), цели Метрики (reachGoal)
// и e-commerce события для Метрики (dataLayer) и GA4 (gtag).
// Счётчики грузятся только с согласия на аналитические cookie (CookieBanner,
// src/lib/cookieConsent.ts). Без него window.ym/gtag нет, и все функции ниже молча ничего не делают.

import type { Product } from '../api/products'
import type { CartItem } from '../contexts/CartContext'

// ─── ID счётчиков ───────────────────────────────────────
export const YM_ID = 109368038      // номер счётчика Яндекс.Метрики
export const GA_ID = 'G-TPN1XT7ESK' // ID потока Google Analytics

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

// ─── Подключение счётчиков ──────────────────────────────
// Точка входа на сайт. Если согласие дали уже после переходов по сайту, первым хитом
// отправляем её, а не текущую страницу: в её URL рекламные метки (yclid, utm_*),
// без них Директ не свяжет визит с кликом по объявлению.
const landingUrl = typeof window !== 'undefined' ? window.location.href : ''
const landingTitle = typeof document !== 'undefined' ? document.title : ''
let analyticsLoaded = false

function appendScript(src: string) {
  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

function loadMetrika(afterNavigation: boolean) {
  // Очередь вызовов до загрузки tag.js — как в штатном сниппете счётчика
  if (!window.ym) {
    const queue: IArguments[] = []
    const ym = function () {
      // eslint-disable-next-line prefer-rest-params -- tag.js разбирает очередь из arguments
      queue.push(arguments)
    }
    window.ym = Object.assign(ym, { a: queue, l: Date.now() })
  }
  appendScript('https://mc.yandex.ru/metrika/tag.js')
  window.dataLayer = window.dataLayer || []
  window.ym(YM_ID, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    ecommerce: 'dataLayer',
    defer: afterNavigation, // точку входа и текущую страницу отправим сами
  })
  if (afterNavigation) {
    window.ym(YM_ID, 'hit', landingUrl, { referer: document.referrer, title: landingTitle })
    window.ym(YM_ID, 'hit', window.location.href, { title: document.title })
  }
}

function loadGa(afterNavigation: boolean) {
  const dataLayer = (window.dataLayer = window.dataLayer || [])
  if (!window.gtag) {
    window.gtag = function () {
      // eslint-disable-next-line prefer-rest-params -- gtag.js принимает команды только как arguments
      dataLayer.push(arguments)
    }
  }
  window.gtag('js', new Date())
  if (afterNavigation) {
    window.gtag('config', GA_ID, { send_page_view: false })
    window.gtag('event', 'page_view', { page_location: landingUrl, page_referrer: document.referrer, page_title: landingTitle })
    window.gtag('event', 'page_view', { page_location: window.location.href, page_title: document.title })
  } else {
    window.gtag('config', GA_ID)
  }
  appendScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`)
}

/**
 * Подключает Метрику и GA4. Вызывается только с согласия посетителя: при старте
 * (main.tsx), если оно уже сохранено, или по «Принять» в cookie-баннере.
 * Стартовую страницу считают сами счётчики (init/config), дальше — usePageTracking.
 */
export function loadAnalytics() {
  if (analyticsLoaded) return
  analyticsLoaded = true
  const afterNavigation = window.location.href !== landingUrl
  loadMetrika(afterNavigation)
  loadGa(afterNavigation)
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
// Без согласия на cookie ничего не копим — иначе Метрика, подключённая позже,
// получила бы и события, случившиеся до согласия.
function ymEcommerce(action: 'detail' | 'add' | 'remove' | 'purchase', payload: Record<string, unknown>) {
  if (typeof window.ym !== 'function') return
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

// ─── Оформление заказа ──────────────────────────────────
// Это ещё НЕ покупка: заказ создан, но может быть не оплачен или пересоздан.
// Поэтому тут только микро-цель воронки order_created. Реальную оплату
// (paid-only, ровно один раз) фиксирует бэк по webhook Робокассы —
// см. project-yandex-direct в памяти.

/** Заказ оформлен и отправлен на оплату Робокассы. */
export function trackOrderCreated(totalRub: number) {
  ymGoal('order_created', { order_price: totalRub, currency: 'RUB' })
}

// ─── ClientID для серверной конверсии ───────────────────
// Бэк по webhook Робокассы шлёт purchase в Метрику/GA4 только по факту оплаты.
// Чтобы связать оплату с посетителем, при оформлении заказа снимаем ClientID
// и передаём его на бэк вместе с заказом. Оба геттера асинхронные (колбэк),
// с таймаутом-фолбэком: если счётчик заблокирован/не готов — вернём undefined,
// заказ всё равно создастся, просто без серверной конверсии.

function readClientId(has: boolean, invoke: (cb: (id: string) => void) => void, timeoutMs: number): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!has) return resolve(undefined)
    let settled = false
    const done = (v?: string) => { if (!settled) { settled = true; resolve(v) } }
    const t = setTimeout(() => done(undefined), timeoutMs)
    try {
      invoke((id) => { clearTimeout(t); done(id || undefined) })
    } catch {
      clearTimeout(t)
      done(undefined)
    }
  })
}

/** ClientID Яндекс.Метрики. */
export function getMetrikaClientId(timeoutMs = 800): Promise<string | undefined> {
  return readClientId(typeof window.ym === 'function', (cb) => window.ym!(YM_ID, 'getClientID', cb), timeoutMs)
}

/** client_id GA4. */
export function getGaClientId(timeoutMs = 800): Promise<string | undefined> {
  return readClientId(typeof window.gtag === 'function', (cb) => window.gtag!('get', GA_ID, 'client_id', cb), timeoutMs)
}
