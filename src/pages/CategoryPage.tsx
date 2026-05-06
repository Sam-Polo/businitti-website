import { useParams } from 'react-router-dom'
import { externalLinks } from '../config/links'
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

const placeholderProducts = [
  { id: 1, name: 'Колье из натурального малахита с подвеской', price: '4 990 ₽' },
  { id: 2, name: 'Колье из лабрадорита с подвеской', price: '5 490 ₽' },
  { id: 3, name: 'Колье из розового кварца', price: '3 990 ₽' },
  { id: 4, name: 'Колье из аметиста с подвеской', price: '4 490 ₽' },
  { id: 5, name: 'Колье из тигрового глаза', price: '4 290 ₽' },
  { id: 6, name: 'Колье из лунного камня', price: '5 990 ₽' },
  { id: 7, name: 'Колье из бирюзы с подвеской', price: '4 790 ₽' },
  { id: 8, name: 'Колье из граната с подвеской', price: '5 290 ₽' },
]

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>()
  const data = slug ? categoryData[slug] : undefined
  const title = data?.title ?? slug ?? 'Категория'
  const description = data?.description ?? ''

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
          <div className="category-grid">
            {placeholderProducts.map((product) => (
              <div key={product.id} className="product-card">
                <div className="product-card__image" />
                <div className="product-card__info">
                  <p className="product-card__name">{product.name}</p>
                  <p className="product-card__price">{product.price}</p>
                </div>
              </div>
            ))}
          </div>
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
