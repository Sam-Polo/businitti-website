import { Link } from 'react-router-dom'
import { externalLinks } from '../config/links'
import { categories } from '../data/categories'
import './MainPage.css'

export default function MainPage() {
  return (
    <main className="main-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero__inner container">
          <div className="hero__image-wrapper">
          </div>
          <div className="hero__content">
            <h1 className="hero__title">
              Авторские украшения <span className="hero__title-accent">из натуральных материалов</span>
            </h1>
            <Link to="/catalog" className="btn btn--outline hero__btn">
              <span>Перейти в каталог</span>
              <svg width="58" height="1" viewBox="0 0 58 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line y1="0.5" x2="58" y2="0.5" stroke="currentColor" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Catalog */}
      <section className="catalog container">
        <div className="catalog__header">
          <div className="catalog__titles">
            <h2 className="catalog__title">Каталог</h2>
            <p className="catalog__desc">
              Наши украшения для любого случая<br />
              Для офиса или отпуска, свидания или вечеринки — у каждого повода
              есть своё настроение, а у нас есть то самое украшение, чтобы его подчеркнуть
            </p>
          </div>
          <h3 className="catalog__subtitle">Выбери свое</h3>
        </div>

        <div className="catalog__grid">
          {categories.map((cat, i) => (
            <Link
              key={cat.slug}
              to={`/category/${cat.slug}`}
              className={`catalog__card ${i === categories.length - 1 ? 'catalog__card--wide' : ''}`}
            >
              <div className="catalog__card-image" />
              <div className="catalog__card-label">
                <span className="catalog__card-name">{cat.label}</span>
              </div>
              <div className="catalog__card-line">
                <svg width="100" height="1" viewBox="0 0 100 1" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line y1="0.5" x2="100" y2="0.5" stroke="white" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Contacts */}
      <section className="home-contacts">
        <div className="home-contacts__inner">
          <div className="home-contacts__content">
            <div className="home-contacts__text">
              <h2 className="home-contacts__title">Контакты</h2>
              <div className="home-contacts__body">
                <p>
                  Мы стараемся, чтобы каждая покупка приносила радость.
                  Если вы сомневаетесь в размере или хотите увидеть
                  дополнительные фото украшения
                </p>
                <p className="home-contacts__cta-text">Напишите нам</p>
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
          <div className="home-contacts__image" />
        </div>
      </section>
    </main>
  )
}
