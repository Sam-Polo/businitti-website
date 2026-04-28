import { Link } from 'react-router-dom'
import './GuaranteePage.css'

export default function GuaranteePage() {
  return (
    <main className="guarantee-page">
      <div className="guarantee-page__content">
        {/* Main guarantee section */}
        <section className="guarantee-main">
          <div className="guarantee-top">
            <div className="guarantee-header">
              <div className="guarantee-header__text">
                <h1 className="guarantee-header__title">Гарантия и возврат</h1>
                <div className="guarantee-header__desc">
                  <p>
                    Мы гарантируем качество каждого изделия.
                    Срок гарантии — 14 дней с момента получения заказа.
                  </p>
                  <p>
                    Если украшение пришло с дефектом или не соответствует
                    описанию, мы заменим его или вернём деньги.
                  </p>
                </div>
              </div>
              <div className="guarantee-header__image" />
            </div>

            <div className="guarantee-return">
              <div className="guarantee-return__text">
                <p>
                  Возврат возможен в течение 14 дней с момента получения,
                  при сохранении товарного вида и упаковки.
                </p>
                <p>
                  Возврат денежных средств осуществляется на реквизиты
                  покупателя в течение 10 рабочих дней.
                </p>
              </div>
              <p className="guarantee-return__cta">
                Для оформления возврата свяжитесь с&nbsp;менеджером.
              </p>
            </div>
          </div>

          <Link to="/contacts" className="btn btn--outline guarantee-btn">
            <span>Связаться</span>
            <svg width="58" height="1" viewBox="0 0 58 1" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line y1="0.5" x2="58" y2="0.5" stroke="currentColor" />
            </svg>
          </Link>
        </section>

        {/* Exclusions section */}
        <section className="guarantee-exclusions">
          <div className="guarantee-exclusions__header">
            <h2 className="guarantee-exclusions__title">
              Гарантия не распространяется на:
            </h2>
          </div>
          <div className="guarantee-exclusions__list">
            <div className="guarantee-exclusions__item">
              <p>Механические повреждения изделия</p>
            </div>
            <div className="guarantee-exclusions__item">
              <p>Естественный износ при длительной эксплуатации</p>
            </div>
            <div className="guarantee-exclusions__item">
              <p>Повреждения, вызванные неправильным уходом за изделием</p>
            </div>
            <div className="guarantee-exclusions__item">
              <p>Изменение внешнего вида натуральных камней со временем</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
