import { useEffect, useState } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { useExternalLinks } from '../config/links'
import { fetchProductsByCategory, formatPrice, type Product } from '../api/products'
import { useCategories } from '../contexts/CategoriesContext'
import { useCart } from '../contexts/CartContext'
import { productPath } from '../hooks/useProductRoute'
import { useSiteContent } from '../contexts/SiteContentContext'
import { RichText } from '../lib/RichText'
import { RevealImage } from '../lib/RevealImage'
import contactsImgDefault from '../assets/img/home-contacts__image.png'
import './CategoryPage.css'

// фолбэк-заголовки, если категория не загрузилась из админки
const FALLBACK_TITLES: Record<string, string> = {
  necklaces: 'Колье',
  bracelets: 'Браслеты',
  earrings: 'Серьги',
  pearl: 'Изделия из жемчуга',
  sets: 'Комплекты',
  beach: 'Пляжная коллекция',
  boho: 'Бохо-Этно',
}

const HOME_CONTACTS_DESC_DEFAULT =
  'Мы стараемся, чтобы каждая покупка приносила радость. Если вы сомневаетесь в размере или хотите увидеть дополнительные фото украшения'

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()

  const { openCart, totalCount } = useCart()
  const externalLinks = useExternalLinks()
  const contactsImage = useSiteContent('category.contacts_image', contactsImgDefault)
  const contactsDesc = useSiteContent('home.contacts_desc', HOME_CONTACTS_DESC_DEFAULT)

  const { categories } = useCategories()
  const found = slug ? categories.find((c) => c.key === slug) : undefined
  const title = found?.title || (slug ? FALLBACK_TITLES[slug] : undefined) || slug || 'Категория'
  const description = found?.description || ''

  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setProducts(null)
    setError(null)
    fetchProductsByCategory(slug)
      .then((items) => { if (!cancelled) setProducts(items) })
      .catch((e) => { if (!cancelled) setError(e?.message || 'load_failed') })
    return () => { cancelled = true }
  }, [slug])

  return (
    <main className="category-page">
      <div className="category-page__content">
        {/* Category header */}
        <section className="category-header">
          <div className="category-intro reveal">
            <h1 className="category-intro__title">{title}</h1>
            {description && (
              <div className="category-intro__desc reveal-stagger">
                <RichText text={description} paragraphClassName="category-intro__desc-p" paragraphReveal />
              </div>
            )}
          </div>

          {/* Product grid */}
          {products === null && !error && (
            <div className="category-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="product-card product-card--skeleton">
                  <div className="product-card__image" />
                  <div className="product-card__info">
                    <p className="product-card__name product-card__name--skeleton">&nbsp;</p>
                    <div className="product-card__price-wrap">
                      <p className="product-card__price product-card__price--skeleton">&nbsp;</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && (
            <p className="category-grid__error">Не удалось загрузить товары</p>
          )}
          {products && products.length === 0 && (
            <p className="category-grid__empty">В этой категории пока нет товаров</p>
          )}
          {products && products.length > 0 && (
            <div className="category-grid reveal-stagger">
              {products.map((product, i) => {
                const price = product.discount_price_rub ?? product.price_rub
                const image = product.images[0]
                return (
                  <Link
                    key={product.slug}
                    to={productPath(slug ?? '', product.slug)}
                    state={{ product }}
                    className="product-card reveal"
                    style={{ ['--i' as string]: i % 6 }}
                  >
                    {image ? (
                      <RevealImage className="product-card__image" src={image} alt="" />
                    ) : (
                      <div className="product-card__image" />
                    )}
                    <div className="product-card__info">
                      <p className="product-card__name">{product.title}</p>
                      <div className="product-card__price-wrap">
                        <p className={`product-card__price${product.discount_price_rub ? ' product-card__price--new' : ''}`}>
                          {formatPrice(price)}
                        </p>
                        {product.discount_price_rub && (
                          <p className="product-card__price product-card__price--old">{formatPrice(product.price_rub)}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Contacts section */}
      <section className="category-contacts reveal">
        <div className="category-contacts__inner">
          <div className="category-contacts__content">
            <div className="category-contacts__text">
              <h2 className="category-contacts__title">Контакты</h2>
              <div className="category-contacts__body">
                <RichText text={contactsDesc} paragraphClassName="category-contacts__desc" />
                <p className="category-contacts__cta-text">Напишите нам</p>
              </div>
            </div>
            <a
              href={externalLinks.contactsCtaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary"
            >
              {externalLinks.contactsCtaLabel}
            </a>
          </div>
          <RevealImage className="category-contacts__image" src={contactsImage} alt="" />
        </div>
      </section>

      {/* Cart floating button */}
      {totalCount > 0 && <button type="button" className="cart-button" onClick={openCart} aria-label="Открыть корзину">
        <svg width="31" height="34" viewBox="0 0 31 34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1H5.8L9.4 20.4H25L29 7H7" stroke="#2F2F2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="11" cy="29" r="3" fill="#2F2F2F" />
          <circle cx="23" cy="29" r="3" fill="#2F2F2F" />
        </svg>
        <span key={totalCount} className="cart-button__badge badge-pulse">{totalCount}</span>
      </button>}

      {/* Вложенный роут товара /category/:slug/:productSlug — управляет модалкой, ничего не рисует */}
      <Outlet />
    </main>
  )
}
