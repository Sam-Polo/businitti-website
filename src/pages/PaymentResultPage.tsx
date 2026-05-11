import { Link, useSearchParams } from 'react-router-dom'
import './PaymentResultPage.css'

type Props = {
  variant: 'success' | 'fail'
}

export default function PaymentResultPage({ variant }: Props) {
  const [searchParams] = useSearchParams()
  const invId = searchParams.get('invId') || ''

  const isSuccess = variant === 'success'

  return (
    <main className={`payment-result payment-result--${variant}`}>
      <div className="payment-result__inner">
        <div className="payment-result__visual" aria-hidden="true">
          {isSuccess ? <SuccessGraphic /> : <FailGraphic />}
        </div>

        <h1 className="payment-result__title">
          {isSuccess ? 'Спасибо за заказ!' : 'Оплата не прошла'}
        </h1>

        <div className="payment-result__body">
          {isSuccess ? (
            <>
              <p>Оплата получена. Мы соберём заказ в течение 2–5 дней и отправим выбранной службой доставки.</p>
              <p>Подтверждение и трек-номер придут на указанную почту.</p>
            </>
          ) : (
            <>
              <p>Что-то пошло не так — деньги остались у вас.</p>
              <p>Попробуйте оформить заказ ещё раз или свяжитесь с нами.</p>
            </>
          )}
        </div>

        {invId && (
          <p className="payment-result__order">
            {isSuccess ? 'Номер заказа' : 'Номер заказа'}: <span>#{invId}</span>
          </p>
        )}

        <div className="payment-result__actions">
          <Link to="/catalog" className="btn btn--primary payment-result__btn">
            {isSuccess ? 'В каталог' : 'Вернуться в каталог'}
          </Link>
          <Link to="/" className="payment-result__link">
            На главную
          </Link>
        </div>
      </div>
    </main>
  )
}

function SuccessGraphic() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" stroke="#2F2F2F" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="44" fill="#F5A2B7" fillOpacity="0.18" />
      <path
        d="M40 62 L54 76 L82 46"
        stroke="#2F2F2F"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="22" cy="30" r="2" fill="#F5A2B7" />
      <circle cx="96" cy="86" r="2.5" fill="#F5A2B7" />
      <circle cx="100" cy="34" r="1.5" fill="#2F2F2F" />
      <circle cx="20" cy="92" r="1.5" fill="#2F2F2F" />
    </svg>
  )
}

function FailGraphic() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="58" stroke="#2F2F2F" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="44" fill="#F5A2B7" fillOpacity="0.10" />
      <path
        d="M44 44 L76 76 M76 44 L44 76"
        stroke="#2F2F2F"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="22" cy="30" r="2" fill="#F5A2B7" />
      <circle cx="96" cy="86" r="2.5" fill="#F5A2B7" />
    </svg>
  )
}
