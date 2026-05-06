import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { externalLinks } from '../config/links'
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
          <NavLink to="/catalog" className="header__link" onClick={closeMenu}>Каталог</NavLink>
          <NavLink to="/delivery" className="header__link" onClick={closeMenu}>Покупателям</NavLink>
          <NavLink to="/contacts" className="header__link" onClick={closeMenu}>Контакты</NavLink>
          <a href={externalLinks.support} target="_blank" rel="noopener noreferrer" className="header__link header__link--accent" onClick={closeMenu}>Поддержка</a>
        </nav>
      </div>
    </header>
  )
}
