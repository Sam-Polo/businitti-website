import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useExternalLinks } from '../config/links'
import { categories } from '../data/categories'
import logo from '../assets/logo.svg'
import maxIcon from '../assets/max-icon.svg'
import './Header.css'

const customerLinks = [
  { to: '/delivery', label: 'Доставка и оплата' },
  { to: '/guarantee', label: 'Гарантия и возврат' },
  { to: '/recommendations', label: 'Рекомендации по уходу' },
]

export default function Header() {
  const externalLinks = useExternalLinks()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  const closeMenu = () => setMenuOpen(false)

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  // Lock body scroll when menu is open
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeMenu() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <>
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

          {/* Desktop nav (hidden on mobile) */}
          <nav className="header__nav">
            <NavLink to="/about" className="header__link">О бренде</NavLink>
            <NavLink to="/catalog" className="header__link">Каталог</NavLink>
            <NavLink to="/delivery" className="header__link">Покупателям</NavLink>
            <NavLink to="/contacts" className="header__link">Контакты</NavLink>
            <a href={externalLinks.support} target="_blank" rel="noopener noreferrer" className="header__link header__link--accent">Поддержка</a>
          </nav>
        </div>
      </header>

      {/* Mobile burger drawer */}
      <div
        className={`burger-drawer ${menuOpen ? 'burger-drawer--open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="burger-drawer__overlay" onClick={closeMenu} />
        <aside className="burger-drawer__panel" aria-label="Главное меню">
          <div className="burger-drawer__top">
            <Link to="/" className="burger-drawer__logo" onClick={closeMenu}>
              <img src={logo} alt="Businitti" width="66" height="25" />
            </Link>
          </div>

          <nav className="burger-drawer__nav">
            <NavLink to="/" end className="burger-drawer__link" onClick={closeMenu}>Главная</NavLink>
            <NavLink to="/about" className="burger-drawer__link" onClick={closeMenu}>О бренде</NavLink>

            <div className="burger-drawer__group">
              <NavLink to="/catalog" className="burger-drawer__link" onClick={closeMenu}>Каталог</NavLink>
              <ul className="burger-drawer__sublist">
                {categories.map((cat) => (
                  <li key={cat.slug}>
                    <Link to={`/category/${cat.slug}`} className="burger-drawer__sublink" onClick={closeMenu}>
                      {cat.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="burger-drawer__group">
              <NavLink to="/delivery" className="burger-drawer__link" onClick={closeMenu}>Покупателям</NavLink>
              <ul className="burger-drawer__sublist">
                {customerLinks.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className="burger-drawer__sublink" onClick={closeMenu}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <NavLink to="/contacts" className="burger-drawer__link" onClick={closeMenu}>Контакты</NavLink>
            <a
              href={externalLinks.support}
              target="_blank"
              rel="noopener noreferrer"
              className="burger-drawer__link"
              onClick={closeMenu}
            >
              Поддержка
            </a>
          </nav>

          <div className="burger-drawer__social">
            <a href={externalLinks.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="burger-drawer__social-link">
              <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12.5" cy="12.5" r="12.5" fill="#F5A2B7" />
                <path d="M17.5 8L15.8 17.1C15.8 17.1 15.6 17.6 15 17.3L11.2 14.4L9.8 13.7L7.2 12.9C7.2 12.9 6.8 12.7 6.8 12.4C6.8 12 7.2 11.9 7.2 11.9L16.7 8.2C16.7 8.2 17.5 7.8 17.5 8Z" fill="white" />
              </svg>
            </a>
            <a href={externalLinks.max} target="_blank" rel="noopener noreferrer" aria-label="MAX" className="burger-drawer__social-link">
              <img src={maxIcon} alt="MAX" width="25" height="25" />
            </a>
          </div>
        </aside>
      </div>
    </>
  )
}
