import { Link } from 'react-router-dom'
import { useCategories } from '../contexts/CategoriesContext'
import arrowWhiteIcon from '../assets/img/Line 1 white.svg'
import './CatalogPage.css'

export default function CatalogPage() {
  const { categories } = useCategories()

  return (
    <main className="catalog-page">
      <div className="catalog-page__content">
        <div className="catalog-page__header reveal">
          <div className="catalog-page__titles">
            <h1 className="catalog-page__title">Каталог</h1>
            <p className="catalog-page__desc">
              Наши украшения для любого случая<br />
              Для офиса или отпуска, свидания или вечеринки — у каждого повода
              есть своё настроение, а у нас есть то самое украшение, чтобы его подчеркнуть
            </p>
          </div>
          <h2 className="catalog-page__subtitle">Выбери свое</h2>
        </div>

        <div className="catalog-page__grid reveal-stagger">
          {categories.map((cat, i) => (
            <Link
              key={cat.key}
              to={`/category/${cat.key}`}
              className={`catalog-page__card reveal ${i === categories.length - 1 && categories.length % 2 === 1 ? 'catalog-page__card--wide' : ''}`}
              style={{ ['--i' as string]: i }}
            >
              <div
                className="catalog-page__card-image"
                style={cat.image ? { backgroundImage: `url(${cat.image})`, backgroundSize: 'cover', backgroundPosition: cat.image_position || 'center' } : undefined}
              />
              <div className="catalog-page__card-label">
                <span className="catalog-page__card-name">{cat.title}</span>
              </div>
              <div className="catalog-page__card-line">
                <img src={arrowWhiteIcon} alt="" width="58" height="6" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
