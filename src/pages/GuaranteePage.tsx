import { externalLinks } from '../config/links'
import './GuaranteePage.css'

const exclusions = [
  'Естественное потускнение, царапины, потёртости покрытия в результате носки',
  'Механические повреждения (изгиб, разрыв звеньев, слом замка) по вине пользователя',
  'Изменение цвета при контакте с водой, духами, кремами, потом',
]

export default function GuaranteePage() {
  return (
    <main className="guarantee-page">
      <div className="guarantee-page__content">

        <section className="guarantee-main">
          <div className="guarantee-block">
            <h1 className="guarantee-header__title">Гарантия и возврат</h1>

            <div className="guarantee-body">
              <div className="guarantee-header__image" />

              <div className="guarantee-return">
                <div className="guarantee-return__texts">
                  <p>
                    Все наши изделия находятся на гарантии и подлежат ремонту, замене на аналогичное
                    или возврату уплаченной суммы (с возвратом товара) в случае производственного дефекта
                    (сломанный замок, разорванное звено или тросик без внешнего воздействия)
                    в течение 14 календарных дней с момента получения заказа.
                  </p>
                  <p>
                    Товар должен быть в оригинальном виде, без следов использования, в оригинальной упаковке.
                  </p>
                  <p>
                    Возврат денежных средств осуществляется на ту же карту, с которой была произведена
                    оплата в течении 10 рабочих дней.
                  </p>
                </div>
                <p className="guarantee-return__cta">
                  Для оформления возврата свяжитесь с&nbsp;менеджером.
                </p>
              </div>
            </div>
          </div>

          <a href={externalLinks.support} target="_blank" rel="noopener noreferrer" className="btn btn--outline guarantee-btn">
            <span>Связаться</span>
            <svg width="58" height="1" viewBox="0 0 58 1" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line y1="0.5" x2="58" y2="0.5" stroke="currentColor" />
            </svg>
          </a>
        </section>

        <section className="guarantee-exclusions">
          <h2 className="guarantee-exclusions__title">
            Гарантия не распространяется на:
          </h2>
          <div className="guarantee-exclusions__list">
            <hr className="guarantee-exclusions__line" />
            {exclusions.map((item, i) => (
              <div key={i}>
                <p className="guarantee-exclusions__item">{item}</p>
                <hr className="guarantee-exclusions__line" />
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  )
}
