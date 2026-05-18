import { Fragment, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { externalLinks } from '../config/links'
import { fetchProductsByCategory, formatPrice, type Product } from '../api/products'
import { useCart } from '../contexts/CartContext'
import { useSiteContent } from '../contexts/SiteContentContext'
import contactsImgDefault from '../assets/img/home-contacts__image.png'
import './CategoryPage.css'

const categoryData: Record<string, { title: string; description: string }> = {
  necklaces: {
    title: 'Колье',
    description:
      'В этом разделе собраны стильные и выразительные украшения, созданные чтобы подчеркнуть женскую привлекательность их обладательницы.\n\n**От минималистичных чокеров на каждый день до роскошных колье для особых моментов** — найдите то самое звено, которое завершит ваш образ и поднимет настроение',
  },
  bracelets: {
    title: 'Браслеты',
    description:
      '**Задумайтесь:** на что мы смотрим чаще всего в течение дня? На экран телефона, в окно, в лицо собеседника. И — на свои руки.\n\nМы смотрим на них постоянно: за работой, за чашкой кофе, в тихой домашней суете, и наедине с собой. Руки всегда перед глазами. Они — главные герои нашего повседневного видеоряда.\n\nИ если серьги и колье мы видим только в зеркале, то браслет сопровождает нас каждую минуту. **Браслет — это украшение, которое вы носите в первую очередь для собственного удовольствия**',
  },
  earrings: {
    title: 'Серьги',
    description:
      '**Бриллианты - это статус, классика.**\nБлестит, но не греет душу.\n\nА наши серьги с натуральными камнями, жемчугом, перламутром живут вместе с вами: откликаются на внутреннее состояние и создают настроение.\n\n**Выбирайте то, что заставит вас улыбнуться своему отражению**',
  },
  pearl: {
    title: 'Изделия из жемчуга',
    description:
      '**«Жемчуг всегда прав!»** когда-то сказала несравненная Коко Шанель. Она научила нас главному: жемчуг — это не правило хорошего тона. Это игра.\n\nИ когда вы надеваете его поверх повседневной футболки, сочетаете с классикой, джинсами, комбинируете с другими украшениями, вы повторяете её революцию.\n\nЖемчуг не должен молчать — **он должен заявлять о вкусе своей владелицы, оставаясь вечным, как сама Шанель**',
  },
  sets: {
    title: 'Комплекты',
    description:
      '**Кому НЕ нужны комплекты?**\n\nТем, кто обожает часами собирать разные украшения в один образ, как конструктор.\n\nТем, у кого свой личный ювелирный стилист.\n\nВсем остальным — добро пожаловать в раздел «Комплекты»',
  },
  beach: {
    title: 'Пляжная коллекция',
    description:
      'Лето — это не просто время года. Это состояние души, когда мы сбрасываем тяжесть повседневности и растворяемся в бесконечном «сейчас».\n\n**Наша новая пляжная коллекция — это ода беззаботности, ласковому солнцу и теплому морю**',
  },
  boho: {
    title: 'Бохо-Этно',
    description:
      'Наши украшения в стиле бохо-этно —\nэто манифест несовершенной красоты.\n\nУкрашения здесь — не для того, чтобы соответствовать дресс-коду, а чтобы рассказать историю. Надевая их, вы словно говорите миру:\n**«Я — часть чего-то большого, древнего и вечного. Я свободна. Я иду своим путем»**',
  },
}

function renderRichLine(line: string, lineKey: number) {
  const parts = line.split('**')
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={`${lineKey}-${i}`} className="category-intro__accent">{part}</span>
    ) : (
      <Fragment key={`${lineKey}-${i}`}>{part}</Fragment>
    )
  )
}

function renderDescription(text: string) {
  const paragraphs = text.split('\n\n')
  return paragraphs.map((para, pi) => {
    const lines = para.split('\n')
    return (
      <p key={pi} className="category-intro__desc-p">
        {lines.map((line, li) => (
          <Fragment key={li}>
            {li > 0 && <br />}
            {renderRichLine(line, li)}
          </Fragment>
        ))}
      </p>
    )
  })
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const data = slug ? categoryData[slug] : undefined
  const title = data?.title ?? slug ?? 'Категория'
  const description = data?.description ?? ''

  const { openItem, openCart, totalCount } = useCart()
  const contactsImage = useSiteContent('category.contacts_image', contactsImgDefault)

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
              <div className="category-intro__desc">{renderDescription(description)}</div>
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
                  <button
                    key={product.slug}
                    type="button"
                    className="product-card reveal"
                    style={{ ['--i' as string]: i % 6 }}
                    onClick={() => openItem(product)}
                  >
                    <div
                      className="product-card__image"
                      style={image ? { backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                    />
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
                  </button>
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
                <p className="category-contacts__desc">
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
          <div className="category-contacts__image" style={{ backgroundImage: `url(${contactsImage})` }} />
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
    </main>
  )
}
