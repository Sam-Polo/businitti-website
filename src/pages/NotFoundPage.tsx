import { Link } from 'react-router-dom'
import arrowIcon from '../assets/Line 1.svg'
import './NotFoundPage.css'

export default function NotFoundPage() {
  return (
    <main className="not-found-page">
      <div className="not-found-page__content">
        <p className="not-found-page__code">
          4<span className="not-found-page__code-accent">0</span>4
        </p>
        <h1 className="not-found-page__title">Страница не&nbsp;найдена</h1>
        <p className="not-found-page__desc">
          Возможно, ссылка устарела или&nbsp;была введена с&nbsp;ошибкой.
          Проверьте адрес или&nbsp;вернитесь на&nbsp;главную.
        </p>
        <Link to="/" className="btn btn--outline not-found-page__btn">
          <span>Вернуться на главную</span>
          <img src={arrowIcon} alt="" width="58" height="6" />
        </Link>
      </div>
    </main>
  )
}
