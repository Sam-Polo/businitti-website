import { useCallback, useEffect, useRef, useState } from 'react'
import { useCart } from '../contexts/CartContext'
import { availableStock, formatPrice, type Product } from '../api/products'
import { trackAddToCart } from '../lib/analytics'
import { useModalAnimation } from '../hooks/useModalAnimation'
import { useCloseProduct } from '../hooks/useProductRoute'
import { RichText } from '../lib/RichText'
import { Lightbox } from './Lightbox'
import './ItemCardModal.css'

export default function ItemCardModal() {
  const { itemModalProduct, addItem, items: cartItems } = useCart()
  const { shouldRender, isClosing } = useModalAnimation(!!itemModalProduct)
  const closeProduct = useCloseProduct()
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  // Read latest lightboxOpen inside the key listener without re-binding the
  // body-lock effect every time it toggles (which caused scroll lock to leak).
  const lightboxOpenRef = useRef(lightboxOpen)
  lightboxOpenRef.current = lightboxOpen

  // Уход с /product/:slug сразу зануляет товар, но JSX должен дожить до конца
  // анимации закрытия — поэтому держим последний показанный в state.
  const [product, setProduct] = useState<Product | null>(itemModalProduct)
  useEffect(() => {
    if (itemModalProduct) setProduct(itemModalProduct)
  }, [itemModalProduct])

  // Повторный клик по крестику/фону не должен уводить назад дважды.
  const closeRequestedRef = useRef(false)
  useEffect(() => {
    if (itemModalProduct) closeRequestedRef.current = false
  }, [itemModalProduct])

  const handleClose = useCallback(() => {
    if (closeRequestedRef.current || !product) return
    closeRequestedRef.current = true
    closeProduct()
  }, [product, closeProduct])

  useEffect(() => {
    if (!itemModalProduct) return
    setActiveImage(0)
    setQuantity(1)
    setLightboxOpen(false)
  }, [itemModalProduct])

  // Фон держим заблокированным всю жизнь модалки, включая анимацию закрытия.
  useEffect(() => {
    if (!shouldRender) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [shouldRender])

  useEffect(() => {
    if (!itemModalProduct) return
    const onKey = (e: KeyboardEvent) => {
      // Skip while lightbox is open — it handles its own Escape (capture-phase listener).
      if (lightboxOpenRef.current) return
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [itemModalProduct, handleClose])

  if (!shouldRender || !product) return null

  const price = product.discount_price_rub ?? product.price_rub
  const images = product.images.length > 0 ? product.images : [undefined]
  const mainImg = images[activeImage]

  // остаток кончился → предзаказ; иначе нельзя набрать больше, чем есть,
  // с учётом уже лежащего в корзине
  const isPreorder = !!product.preorder
  const inCart = cartItems.find((it) => it.slug === product.slug)?.quantity ?? 0
  const maxQuantity = availableStock(product) - inCart
  const soldOut = maxQuantity < 1
  const cappedQuantity = soldOut ? 1 : Math.min(quantity, maxQuantity)

  const handleAdd = () => {
    if (soldOut) return
    trackAddToCart(product, cappedQuantity)
    addItem(product, cappedQuantity)
    handleClose()
  }

  return (
    <>
    <div className={`item-modal${isClosing ? ' is-closing' : ''}`} onClick={handleClose}>
      <div className="item-modal__card" onClick={(e) => e.stopPropagation()}>
        <button className="item-modal__close" onClick={handleClose} aria-label="Закрыть">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4L20 20M20 4L4 20" stroke="#2F2F2F" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="item-modal__gallery">
          <button
            key={activeImage}
            type="button"
            className="item-modal__photo"
            style={mainImg ? { backgroundImage: `url(${mainImg})` } : undefined}
            onClick={() => { if (mainImg) setLightboxOpen(true) }}
            disabled={!mainImg}
            aria-label="Открыть фото на весь экран"
          >
            {mainImg && (
              <span className="item-modal__expand" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2H16V8M16 2L10 8M2 16H8M2 16V10M2 16L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </button>
          {images.length > 1 && (
            <div className="item-modal__thumbs">
              {images.map((img, i) => (
                <button
                  key={i}
                  className={`item-modal__thumb ${i === activeImage ? 'item-modal__thumb--active' : ''}`}
                  style={img ? { backgroundImage: `url(${img})` } : undefined}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Фото ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="item-modal__info">
          <div className="item-modal__head">
            <h2 className="item-modal__title">{product.title}</h2>
            {product.article && <p className="item-modal__article">Арт. {product.article}</p>}
          </div>

          {product.description && (
            <div className="item-modal__desc">
              <RichText text={product.description} />
            </div>
          )}

          <div className="item-modal__purchase">
            <div className="item-modal__qty">
              <button
                type="button"
                className="item-modal__qty-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={soldOut}
                aria-label="Уменьшить"
              >−</button>
              <span className="item-modal__qty-value">{cappedQuantity}</span>
              <button
                type="button"
                className="item-modal__qty-btn"
                onClick={() => setQuantity((q) => Math.min(q + 1, maxQuantity))}
                disabled={soldOut || cappedQuantity >= maxQuantity}
                aria-label="Увеличить"
              >+</button>
            </div>
            <div className="item-modal__price-wrap">
              <p className={`item-modal__price${product.discount_price_rub ? ' item-modal__price--new' : ''}`}>
                {formatPrice(price * cappedQuantity)}
              </p>
              {product.discount_price_rub && (
                <p className="item-modal__price item-modal__price--old">{formatPrice(product.price_rub * cappedQuantity)}</p>
              )}
            </div>
          </div>

          {isPreorder && (
            <p className="item-modal__stock-note">
              Товара сейчас нет в наличии — оформите предзаказ, мы изготовим его для вас
            </p>
          )}
          {!isPreorder && Number.isFinite(maxQuantity) && cappedQuantity >= maxQuantity && (
            <p className="item-modal__stock-note">
              {soldOut ? 'Всё, что есть в наличии, уже в корзине' : `В наличии ${maxQuantity} шт.`}
            </p>
          )}

          <button
            className={`item-modal__add${isPreorder ? ' item-modal__add--preorder' : ''}`}
            onClick={handleAdd}
            disabled={soldOut}
          >
            {isPreorder ? 'Предзаказ' : 'Добавить в корзину'}
          </button>
        </div>
      </div>
    </div>
    {lightboxOpen && product.images.length > 0 && (
      <Lightbox
        images={product.images}
        index={activeImage}
        onChange={setActiveImage}
        onClose={() => setLightboxOpen(false)}
      />
    )}
    </>
  )
}
