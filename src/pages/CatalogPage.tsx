import { Link } from 'react-router-dom'
import { categories } from '../data/categories'
import './CatalogPage.css'

export default function CatalogPage() {
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
              key={cat.slug}
              to={`/category/${cat.slug}`}
              className={`catalog-page__card reveal ${i === categories.length - 1 ? 'catalog-page__card--wide' : ''}`}
              style={{ ['--i' as string]: i }}
            >
              <div className="catalog-page__card-image" />
              <div className="catalog-page__card-label">
                <span className="catalog-page__card-name">{cat.label}</span>
              </div>
              <div className="catalog-page__card-line">
                <svg width="100" height="1" viewBox="0 0 100 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line y1="0.5" x2="100" y2="0.5" stroke="white" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
