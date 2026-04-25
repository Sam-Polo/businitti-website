import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <Link to="/" className="footer__logo">Businitti</Link>
      <nav className="footer__nav">
        <Link to="/about">О бренде</Link>
        <Link to="/delivery">Доставка и оплата</Link>
        <Link to="/guarantee">Гарантия и возврат</Link>
        <Link to="/recommendations">Рекомендации</Link>
        <Link to="/contacts">Контакты</Link>
      </nav>
    </footer>
  )
}
