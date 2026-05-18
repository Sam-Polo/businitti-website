import { useEffect, useState } from 'react'
import yandexIcon from '../assets/yandex-delivery-icon.svg'
import sdekIcon from '../assets/sdek-icon.svg'
import headerImgDefault from '../assets/img/delivery-header__image.jpg'
import paymentImgDefault from '../assets/img/payment-section__image.png'
import { useSiteContent } from '../contexts/SiteContentContext'
import { RichText } from '../lib/RichText'
import { fetchDeliveryPrices, type DeliveryPrices } from '../api/orders'
import './DeliveryPage.css'

const DELIVERY_HEADER_DESC_DEFAULT =
  'Сборка и отправка заказа осуществляется в течение 2-5 рабочих дней с момента оформления заказа.\n\nПри оформлении заказа на сайте введите адрес ближайшего к вам пункта выдачи, из которого вам удобно будет забрать заказ.'

const DELIVERY_PAYMENT_TEXT_DEFAULT =
  'Все заказы оплачиваются онлайн при оформлении заказа — это быстро и безопасно через систему Robokassa.\n\nПокупателю доступны банковские карты и иные способы оплаты, предусмотренные платежной формой на момент совершения заказа.\n\nПосле успешного проведения платежа кассовый чек направляется на указанные покупателем контактные данные.'

export default function DeliveryPage() {
  const headerImage = useSiteContent('delivery.header_image', headerImgDefault)
  const paymentImage = useSiteContent('delivery.payment_image', paymentImgDefault)
  const headerDesc = useSiteContent('delivery.header_desc', DELIVERY_HEADER_DESC_DEFAULT)
  const paymentText = useSiteContent('delivery.payment_text', DELIVERY_PAYMENT_TEXT_DEFAULT)

  const [prices, setPrices] = useState<DeliveryPrices | null>(null)
  useEffect(() => {
    fetchDeliveryPrices().then(setPrices).catch(() => setPrices(null))
  }, [])
  const cdekPrice = prices?.cdek?.price ?? 650
  const yandexPrice = prices?.yandex_market?.price ?? 300

  return (
    <main className="delivery-page">
      <div className="delivery-page__content">
        {/* Delivery Section */}
        <section className="delivery-section">
          <div className="delivery-top">
            {/* Header with image and delivery services */}
            <div className="delivery-header reveal">
              <div className="delivery-header__info">
                <h1 className="delivery-header__title">Доставка и оплата</h1>
                <div className="delivery-header__desc">
                  <p className="delivery-header__subtitle">Доставка:</p>
                  <RichText text={headerDesc} />
                </div>
              </div>

              {/* Delivery services (Frame 26) — bottom-aligned with photo */}
              <div className="delivery-services">
                <h2 className="delivery-services__title">Службы доставки:</h2>
                <div className="delivery-services__rows">
                  <hr className="delivery-services__line" />
                  <div className="delivery-services__row">
                    <span className="delivery-services__text">Яндекс доставка в пункт выдачи {yandexPrice} р.</span>
                    <img src={yandexIcon} alt="" className="delivery-services__icon delivery-services__icon--yandex" />
                  </div>
                  <hr className="delivery-services__line" />
                  <div className="delivery-services__row">
                    <span className="delivery-services__text">СДЭК в пункт выдачи {cdekPrice} р.</span>
                    <img src={sdekIcon} alt="" className="delivery-services__icon delivery-services__icon--sdek" />
                  </div>
                  <hr className="delivery-services__line" />
                </div>
                <p className="delivery-services__note">
                  После отправки заказа на ваши контактные данные, указанные при оформлении заказа, приходит трек-номер посылки.
                </p>
              </div>

              <div className="delivery-header__image reveal" style={{ backgroundImage: `url(${headerImage})` }} />
            </div>
          </div>

          {/* Payment Section */}
          <div className="payment-section reveal">
            <div className="payment-section__image reveal" style={{ backgroundImage: `url(${paymentImage})` }} />
            <h2 className="payment-section__title">Оплата:</h2>
            <RichText text={paymentText} paragraphClassName="payment-section__text" />
          </div>
        </section>
      </div>
    </main>
  )
}
