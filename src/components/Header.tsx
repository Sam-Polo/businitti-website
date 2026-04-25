import { Link } from 'react-router-dom'

export default function Header() {
  return (
    <header className="header">
      <Link to="/" className="header__logo">Businitti</Link>
      <nav className="header__nav">
        <Link to="/category/necklaces">Колье</Link>
        <Link to="/category/bracelets">Браслеты</Link>
        <Link to="/category/earrings">Серьги</Link>
        <Link to="/category/pearl">Жемчуг</Link>
        <Link to="/category/sets">Комплекты</Link>
        <Link to="/category/beach">Пляжная</Link>
        <Link to="/category/boho">Бохо-этно</Link>
      </nav>
    </header>
  )
}
