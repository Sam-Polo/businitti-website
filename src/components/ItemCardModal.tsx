import { useEffect, useState } from 'react'
import { useCart } from '../contexts/CartContext'
import { formatPrice } from '../api/products'
import './ItemCardModal.css'

export default function ItemCardModal() {
  const { itemModalProduct, closeItem, addItem, openCart } = useCart()
  const [activeImage, setActiveImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (!itemModalProduct) return
    setActiveImage(0)
    setQuantity(1)
  }, [itemModalProduct])

  useEffect(() => {
    if (!itemModalProduct) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeItem() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [itemModalProduct, closeItem])

  if (!itemModalProduct) return null

  const product = itemModalProduct
  const price = product.discount_price_rub ?? product.price_rub
  const images = product.images.length > 0 ? product.images : [undefined]
  const mainImg = images[activeImage]

  const handleAdd = () => {
    addItem(product, quantity)
    closeItem()
    openCart()
  }

  return (
    <div className="item-modal" onClick={closeItem}>
      <div className="item-modal__card" onClick={(e) => e.stopPropagation()}>
        <button className="item-modal__close" onClick={closeItem} aria-label="Закрыть">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4L20 20M20 4L4 20" stroke="#2F2F2F" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        <div className="item-modal__gallery">
          <div
            className="item-modal__photo"
            style={mainImg ? { backgroundImage: `url(${mainImg})` } : undefined}
          />
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
            <p className="item-modal__desc">{product.description}</p>
          )}

          <div className="item-modal__purchase">
            <div className="item-modal__qty">
              <button
                type="button"
                className="item-modal__qty-btn"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Уменьшить"
              >−</button>
              <span className="item-modal__qty-value">{quantity}</span>
              <button
                type="button"
                className="item-modal__qty-btn"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Увеличить"
              >+</button>
            </div>
            <div className="item-modal__price-wrap">
              <p className={`item-modal__price${product.discount_price_rub ? ' item-modal__price--new' : ''}`}>
                {formatPrice(price * quantity)}
              </p>
              {product.discount_price_rub && (
                <p className="item-modal__price item-modal__price--old">{formatPrice(product.price_rub * quantity)}</p>
              )}
            </div>
          </div>

          <button className="item-modal__add" onClick={handleAdd}>
            Добавить в корзину
          </button>
        </div>
      </div>
    </div>
  )
}
