import { Fragment } from 'react'
import { externalLinks } from '../config/links'
import arrowIcon from '../assets/Line 1.svg'
import { useSiteContent } from '../contexts/SiteContentContext'
import headerImgDefault from '../assets/img/guarantee-header__image.png'
import './GuaranteePage.css'

const exclusions = [
  'Естественное потускнение, царапины, потёртости покрытия в результате носки',
  'Механические повреждения (изгиб, разрыв звеньев, слом замка) по вине пользователя',
  'Изменение цвета при контакте с водой, духами, кремами, потом',
]

export default function GuaranteePage() {
  const headerImage = useSiteContent('guarantee.header_image', headerImgDefault)
  return (
    <main className="guarantee-page">
      <div className="guarantee-page__content">

        <section className="guarantee-main reveal">
          <div className="guarantee-block">
            <h1 className="guarantee-header__title">Гарантия и возврат</h1>

            <div className="guarantee-return">
              <p className="guarantee-return__text">
                Все наши изделия находятся на гарантии и подлежат ремонту, замене на аналогичное
                или возврату уплаченной суммы (с возвратом товара) в случае производственного дефекта
                (сломанный замок, разорванное звено или тросик без внешнего воздействия)
                в течение 14 календарных дней с момента получения заказа.
              </p>
              <div className="guarantee-header__image reveal" style={{ backgroundImage: `url(${headerImage})` }} />
              <p className="guarantee-return__text">
                Товар должен быть в оригинальном виде, без следов использования, в оригинальной упаковке.
              </p>
              <p className="guarantee-return__text">
                Возврат денежных средств осуществляется на ту же карту, с которой была произведена
                оплата в течение 10 рабочих дней.
              </p>
              <p className="guarantee-return__cta">
                Для оформления возврата свяжитесь с&nbsp;менеджером.
              </p>
            </div>
          </div>

          <a href={externalLinks.support} target="_blank" rel="noopener noreferrer" className="btn btn--outline guarantee-btn">
            <span>Связаться</span>
            <img src={arrowIcon} alt="" width="58" height="6" />
          </a>
        </section>

        <section className="guarantee-exclusions reveal">
          <h2 className="guarantee-exclusions__title">
            Гарантия не распространяется на:
          </h2>
          <div className="guarantee-exclusions__list">
            <hr className="guarantee-exclusions__line" />
            {exclusions.map((item, i) => (
              <Fragment key={i}>
                <div className="guarantee-exclusions__item-wrap">
                  <p className="guarantee-exclusions__item">{item}</p>
                </div>
                <hr className="guarantee-exclusions__line" />
              </Fragment>
            ))}
          </div>
        </section>

      </div>
    </main>
  )
}
