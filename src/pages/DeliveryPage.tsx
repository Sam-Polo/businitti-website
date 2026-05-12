import yandexIcon from '../assets/yandex-delivery-icon.svg'
import sdekIcon from '../assets/sdek-icon.svg'
import './DeliveryPage.css'

export default function DeliveryPage() {
  return (
    <main className="delivery-page">
      <div className="delivery-page__content">
        {/* Delivery Section */}
        <section className="delivery-section">
          <div className="delivery-top">
            {/* Header with image and delivery services */}
            <div className="delivery-header">
              <div className="delivery-header__info">
                <h1 className="delivery-header__title">Доставка и оплата</h1>
                <div className="delivery-header__desc">
                  <p>
                    Мы отправляем заказы по всей России.
                    Доставка осуществляется службой СДЭК
                    до пункта выдачи или курьером до двери.
                  </p>
                  <p>
                    Стоимость доставки рассчитывается автоматически
                    при оформлении заказа и зависит от вашего региона.
                  </p>
                  <p>
                    Срок доставки: 3–7 рабочих дней.
                  </p>
                </div>
              </div>

              {/* Delivery services (Frame 26) — bottom-aligned with photo */}
              <div className="delivery-services">
                <h2 className="delivery-services__title">Службы доставки:</h2>
                <div className="delivery-services__rows">
                  <hr className="delivery-services__line" />
                  <div className="delivery-services__row">
                    <span className="delivery-services__text">Яндекс доставка в пункт выдачи 300 р.</span>
                    <img src={yandexIcon} alt="" className="delivery-services__icon delivery-services__icon--yandex" />
                  </div>
                  <hr className="delivery-services__line" />
                  <div className="delivery-services__row">
                    <span className="delivery-services__text">СДЭК в пункт выдачи 650 р.</span>
                    <img src={sdekIcon} alt="" className="delivery-services__icon delivery-services__icon--sdek" />
                  </div>
                  <hr className="delivery-services__line" />
                </div>
                <p className="delivery-services__note">
                  После отправки заказа на ваши контактные данные, указанные при оформлении заказа, приходит трек-номер посылки.
                </p>
              </div>

              <div className="delivery-header__image" />
            </div>
          </div>

          {/* Payment Section */}
          <div className="payment-section">
            <div className="payment-section__image" />
            <h2 className="payment-section__title">Оплата:</h2>
            <p className="payment-section__text">
              Все заказы оплачиваются онлайн при оформлении заказа —
              это быстро и безопасно через систему Robokassa.
            </p>
            <p className="payment-section__text">
              Покупателю доступны банковские карты и иные способы оплаты,
              предусмотренные платежной формой на момент совершения заказа.
            </p>
            <p className="payment-section__text">
              После успешного проведения платежа кассовый чек направляется
              на указанные покупателем контактные данные.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
