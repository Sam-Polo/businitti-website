import './DeliveryPage.css'

export default function DeliveryPage() {
  return (
    <main className="delivery-page">
      <div className="delivery-page__content">
        {/* Delivery Section */}
        <section className="delivery-section">
          <div className="delivery-top">
            {/* Header with image */}
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
              <div className="delivery-header__image" />
            </div>

            {/* Delivery details */}
            <div className="delivery-details">
              <div className="delivery-methods">
                <h2 className="delivery-methods__title">Способы доставки</h2>
                <div className="delivery-methods__list">
                  <p>СДЭК до пункта выдачи</p>
                  <p>СДЭК курьером до двери</p>
                  <p>Почта России</p>
                </div>
              </div>
              <div className="delivery-methods__row">
                <p className="delivery-methods__list">
                  Все заказы тщательно упаковываются в фирменную упаковку.
                </p>
              </div>
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
