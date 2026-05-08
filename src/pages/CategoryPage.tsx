import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { externalLinks } from '../config/links'
import { fetchProductsByCategory, formatPrice, type Product } from '../api/products'
import './CategoryPage.css'

const categoryData: Record<string, { title: string; description: string }> = {
  necklaces: {
    title: 'Колье',
    description:
      'Колье из натуральных камней — это не просто украшение, а акцент, который завершает образ. Каждое изделие создано вручную и несёт в себе энергию природных минералов.',
  },
  bracelets: {
    title: 'Браслеты',
    description:
      'Браслет — украшение, которое вы видите каждую минуту. За работой, за чашкой кофе, в тихой домашней суете. Наши браслеты из натуральных камней сопровождают вас весь день.',
  },
  earrings: {
    title: 'Серьги',
    description:
      'Серьги из натуральных камней — это способ добавить характер любому образу. От минималистичных до выразительных, каждая пара создана с вниманием к деталям.',
  },
  pearl: {
    title: 'Изделия из жемчуга',
    description:
      'Жемчуг — символ женственности и утончённости. Наши изделия из натурального жемчуга подчеркнут вашу естественную красоту и добавят образу благородства.',
  },
  sets: {
    title: 'Комплекты',
    description:
      'Готовые комплекты украшений — идеальное решение для цельного образа. Колье, браслет и серьги, подобранные в единой стилистике из натуральных камней.',
  },
  beach: {
    title: 'Пляжная коллекция',
    description:
      'Лёгкие, яркие украшения для отпуска и летнего настроения. Натуральные камни и минералы в сочетании с морской эстетикой.',
  },
  boho: {
    title: 'Бохо-Этно',
    description:
      'Наши украшения в стиле бохо-этно — это манифест несовершенной красоты. Украшения здесь — не для того, чтобы соответствовать дресс-коду, а чтобы рассказать историю.',
  },
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const data = slug ? categoryData[slug] : undefined
  const title = data?.title ?? slug ?? 'Категория'
  const description = data?.description ?? ''

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
          <div className="category-intro">
            <h1 className="category-intro__title">{title}</h1>
            {description && (
              <p className="category-intro__desc">{description}</p>
            )}
          </div>

          {/* Product grid */}
          {products === null && !error && (
            <div className="category-grid category-grid--loading" />
          )}
          {error && (
            <p className="category-grid__error">Не удалось загрузить товары</p>
          )}
          {products && products.length === 0 && (
            <p className="category-grid__empty">В этой категории пока нет товаров</p>
          )}
          {products && products.length > 0 && (
            <div className="category-grid">
              {products.map((product) => {
                const price = product.discount_price_rub ?? product.price_rub
                const image = product.images[0]
                return (
                  <div key={product.slug} className="product-card">
                    <div
                      className="product-card__image"
                      style={image ? { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    />
                    <div className="product-card__info">
                      <p className="product-card__name">{product.title}</p>
                      <p className="product-card__price">{formatPrice(price)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Contacts section */}
      <section className="category-contacts">
        <div className="category-contacts__inner">
          <div className="category-contacts__content">
            <div className="category-contacts__text">
              <h2 className="category-contacts__title">Контакты</h2>
              <div className="category-contacts__body">
                <p>
                  Мы стараемся, чтобы каждая покупка приносила радость.
                  Если вы сомневаетесь в размере или хотите увидеть
                  дополнительные фото украшения
                </p>
                <p className="category-contacts__cta-text">Напишите нам</p>
              </div>
            </div>
            <a
              href={externalLinks.max}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary"
            >
              MAX
            </a>
          </div>
          <div className="category-contacts__image" />
        </div>
      </section>

      {/* Cart floating button */}
      <div className="cart-button">
        <svg width="31" height="34" viewBox="0 0 31 34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1H5.8L9.4 20.4H25L29 7H7" stroke="#2F2F2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="11" cy="29" r="3" fill="#2F2F2F" />
          <circle cx="23" cy="29" r="3" fill="#2F2F2F" />
        </svg>
        <span className="cart-button__badge">2</span>
      </div>
    </main>
  )
}
