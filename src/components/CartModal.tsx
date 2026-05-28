import { useEffect, useState, type FormEvent } from 'react'
import { useCart } from '../contexts/CartContext'
import { useExternalLinks } from '../config/links'
import { useSiteContent } from '../contexts/SiteContentContext'
import { formatPrice } from '../api/products'
import { createOrder, fetchDeliveryPrices, fetchOrdersStatus, type DeliveryPrices, type DeliveryService, type OrdersStatus } from '../api/orders'
import { useModalAnimation } from '../hooks/useModalAnimation'
import './CartModal.css'

// дефолтные цены доставки — синхронизированы с бэком (DELIVERY_PRICES в orders-utils.ts).
// при открытии корзины подтягиваем актуальные с /api/public/delivery-prices.
const DEFAULT_DELIVERY: DeliveryPrices = {
  cdek: { price: 650, label: 'СДЭК' },
  yandex_market: { price: 300, label: 'Яндекс Маркет' },
}

const RU_MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

function formatReopenDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  const year = m[1]
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12) return iso
  return `${day} ${RU_MONTHS[month - 1]} ${year}`
}

export default function CartModal() {
  const externalLinks = useExternalLinks()
  const cartNotice = useSiteContent('checkout.cart_notice', 'Сборка и отправка заказа осуществляется в течение 2–5 дней')
  const { isCartOpen, closeCart, items, setQuantity, removeItem, totalPrice, clear } = useCart()
  const { shouldRender, isClosing } = useModalAnimation(isCartOpen)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [delivery, setDelivery] = useState<DeliveryService>('cdek')
  const [address, setAddress] = useState('')
  const [comment, setComment] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [agreedPersonalData, setAgreedPersonalData] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [deliveryPrices, setDeliveryPrices] = useState<DeliveryPrices>(DEFAULT_DELIVERY)
  const [ordersStatus, setOrdersStatus] = useState<OrdersStatus>({ ordersClosed: false, reopenDate: null })

  useEffect(() => {
    fetchDeliveryPrices().then(setDeliveryPrices).catch(() => {/* остаёмся на DEFAULT */})
    fetchOrdersStatus().then(setOrdersStatus).catch(() => {/* по умолчанию открыты */})
  }, [])

  useEffect(() => {
    if (!isCartOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [isCartOpen, closeCart])

  if (!shouldRender) return null

  const deliveryPrice = deliveryPrices[delivery].price
  const grandTotal = totalPrice + (items.length > 0 ? deliveryPrice : 0)

  const phoneDigits = phone.replace(/\D/g, '')
  const isPhoneValid = phoneDigits.length >= 10
  const canSubmit = !submitting && items.length > 0 && agreed && agreedPersonalData && name.trim() && phone.trim() && isPhoneValid && email.trim() && address.trim()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const result = await createOrder({
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        customer_email: email.trim(),
        delivery_service: delivery,
        delivery_address: address.trim(),
        comment: comment.trim() || undefined,
        items: items.map((it) => ({ slug: it.slug, quantity: it.quantity })),
      })
      clear()
      closeCart()
      // редирект на страницу оплаты Робокассы
      window.location.href = result.payment_url
    } catch (err: any) {
      setSubmitError(err?.message || 'Не удалось создать заказ. Попробуйте ещё раз.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`cart-modal${isClosing ? ' is-closing' : ''}`} onClick={closeCart}>
      <div className="cart-modal__card" onClick={(e) => e.stopPropagation()}>
        <button className="cart-modal__close" onClick={closeCart} aria-label="Закрыть">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4L20 20M20 4L4 20" stroke="#2F2F2F" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <h2 className="cart-modal__title">Мой заказ</h2>

        <form className="cart-modal__body" onSubmit={handleSubmit}>
          <div className="cart-modal__items">
            {items.length === 0 && (
              <p className="cart-modal__empty">Корзина пуста</p>
            )}
            {items.map((it) => (
              <div key={it.slug} className="cart-modal__item">
                <div
                  className="cart-modal__item-image"
                  style={it.image ? { backgroundImage: `url(${it.image})` } : undefined}
                />
                <div className="cart-modal__item-info">
                  <p className="cart-modal__item-title">{it.title}</p>
                  <div className="cart-modal__item-qty">
                    <button
                      type="button"
                      onClick={() => setQuantity(it.slug, it.quantity - 1)}
                      aria-label="Уменьшить"
                    >−</button>
                    <span>{it.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(it.slug, it.quantity + 1)}
                      aria-label="Увеличить"
                    >+</button>
                  </div>
                  <p className="cart-modal__item-price">{formatPrice(it.price_rub * it.quantity)}</p>
                </div>
                <button
                  type="button"
                  className="cart-modal__item-remove"
                  onClick={() => removeItem(it.slug)}
                  aria-label="Удалить из корзины"
                >
                  <svg width="11" height="13" viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 3.5H10M4 1H7M2 3.5L2.5 11.5C2.5 12 2.8 12.3 3.3 12.3H7.7C8.2 12.3 8.5 12 8.5 11.5L9 3.5M4.3 5.5V10M6.7 5.5V10" stroke="#2F2F2F" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <div className="cart-modal__form">
            <label className="cart-modal__field">
              <span className="cart-modal__label">Ваше имя</span>
              <input
                type="text"
                className="cart-modal__input"
                placeholder="Мария Иванова"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="cart-modal__field">
              <span className="cart-modal__label">Ваш номер</span>
              <input
                type="tel"
                className={`cart-modal__input${phoneError ? ' cart-modal__input--error' : ''}`}
                placeholder="+7 900 000-00-00"
                value={phone}
                onChange={(e) => {
                  const filtered = e.target.value.replace(/[^\d+\s\-()]/g, '')
                  setPhone(filtered)
                  setPhoneError('')
                }}
                onBlur={() => {
                  if (phone.trim() && phoneDigits.length < 10) {
                    setPhoneError('Введите корректный номер телефона')
                  }
                }}
                required
              />
              {phoneError && <span className="cart-modal__field-error">{phoneError}</span>}
            </label>

            <label className="cart-modal__field">
              <span className="cart-modal__label">Ваш email</span>
              <input
                type="email"
                className="cart-modal__input"
                placeholder="hello@mail.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <fieldset className="cart-modal__field cart-modal__field--radio">
              <legend className="cart-modal__label">Пункт выдачи</legend>
              <label className="cart-modal__radio">
                <input
                  type="radio"
                  name="delivery"
                  checked={delivery === 'cdek'}
                  onChange={() => setDelivery('cdek')}
                />
                <span className="cart-modal__radio-mark" />
                <span className="cart-modal__radio-text">СДЭК — {formatPrice(deliveryPrices.cdek.price)}</span>
              </label>
              <label className="cart-modal__radio">
                <input
                  type="radio"
                  name="delivery"
                  checked={delivery === 'yandex_market'}
                  onChange={() => setDelivery('yandex_market')}
                />
                <span className="cart-modal__radio-mark" />
                <span className="cart-modal__radio-text">Яндекс Маркет — {formatPrice(deliveryPrices.yandex_market.price)}</span>
              </label>
            </fieldset>

            <label className="cart-modal__field">
              <span className="cart-modal__label">Адрес пункта выдачи</span>
              <input
                type="text"
                className="cart-modal__input"
                placeholder="Город, улица, дом"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </label>

            <label className="cart-modal__field">
              <span className="cart-modal__label">Комментарий</span>
              <textarea
                className="cart-modal__input cart-modal__textarea"
                placeholder="Пожелания к заказу"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </label>
          </div>

          <p className="cart-modal__notice">{cartNotice}</p>

          <label className="cart-modal__agree">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="cart-modal__check-mark" />
            <span className="cart-modal__agree-text">
              Ознакомлен с{' '}
              <a href={externalLinks.privacy} target="_blank" rel="noopener noreferrer">Политикой обработки персональных данных</a>
              {' '}и{' '}
              <a href={externalLinks.offer} target="_blank" rel="noopener noreferrer">договором оферты</a>
            </span>
          </label>

          <label className="cart-modal__agree">
            <input
              type="checkbox"
              checked={agreedPersonalData}
              onChange={(e) => setAgreedPersonalData(e.target.checked)}
            />
            <span className="cart-modal__check-mark" />
            <span className="cart-modal__agree-text">
              Даю согласие на обработку персональных данных
            </span>
          </label>

          <div className="cart-modal__totals">
            <p className="cart-modal__sub">Сумма: {formatPrice(totalPrice)}</p>
            <p className="cart-modal__sub">{deliveryPrices[delivery].label}: {formatPrice(deliveryPrice)}</p>
            <p className="cart-modal__total">Итоговая сумма: {formatPrice(grandTotal)}</p>
          </div>

          {submitError && (
            <p className="cart-modal__error" role="alert">{submitError}</p>
          )}

          {ordersStatus.ordersClosed ? (
            <div className="cart-modal__closed-notice">
              <p className="cart-modal__closed-title">Заказы временно недоступны</p>
              <p className="cart-modal__closed-text">
                {ordersStatus.reopenDate
                  ? <>Магазин откроется <span className="cart-modal__closed-date">{formatReopenDate(ordersStatus.reopenDate)}</span></>
                  : 'Скоро снова откроемся'}
              </p>
            </div>
          ) : (
            <button
              type="submit"
              className="cart-modal__submit"
              disabled={!canSubmit}
            >
              {submitting ? 'Создаём заказ…' : 'Оформить заказ'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
