import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import logo from '../assets/logo.svg'
import './Header.css'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__logo" onClick={closeMenu}>
          <img src={logo} alt="Businitti" width="81" height="44" />
        </Link>

        <button
          className={`header__burger ${menuOpen ? 'header__burger--open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Меню"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`header__nav ${menuOpen ? 'header__nav--open' : ''}`}>
          <NavLink to="/about" className="header__link" onClick={closeMenu}>О бренде</NavLink>
          <NavLink to="/category/necklaces" className="header__link" onClick={closeMenu}>Каталог</NavLink>
          <NavLink to="/delivery" className="header__link" onClick={closeMenu}>Покупателям</NavLink>
          <NavLink to="/contacts" className="header__link" onClick={closeMenu}>Контакты</NavLink>
          <NavLink to="/support" className="header__link header__link--accent" onClick={closeMenu}>Поддержка</NavLink>
        </nav>
      </div>
    </header>
  )
}
