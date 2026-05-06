import { Link } from 'react-router-dom'
import { externalLinks } from '../config/links'
import './Footer.css'

const catalogLinks = [
  { to: '/category/necklaces', label: 'Колье' },
  { to: '/category/bracelets', label: 'Браслеты' },
  { to: '/category/earrings', label: 'Серьги' },
  { to: '/category/pearl', label: 'Изделия из жемчуга' },
  { to: '/category/sets', label: 'Комплекты' },
  { to: '/category/beach', label: 'Пляжная коллекция' },
  { to: '/category/boho', label: 'Бохо-этно' },
]

const customerLinks = [
  { to: '/delivery', label: 'Доставка и оплата' },
  { to: '/guarantee', label: 'Гарантия и возврат' },
  { to: '/recommendations', label: 'Рекомендации по уходу' },
]

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__columns">
          <div className="footer__col">
            <h4 className="footer__heading">Каталог</h4>
            <ul className="footer__links">
              {catalogLinks.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="footer__link">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__heading">Покупателям</h4>
            <ul className="footer__links">
              {customerLinks.map(link => (
                <li key={link.to}>
                  <Link to={link.to} className="footer__link">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer__col footer__col--nav">
            <Link to="/about" className="footer__heading footer__heading--link">О бренде</Link>
            <Link to="/contacts" className="footer__heading footer__heading--link">Контакты</Link>
            <Link to="/support" className="footer__heading footer__heading--link">Поддержка</Link>
          </div>
        </div>

        <div className="footer__right">
          <div className="footer__social">
            <a href={externalLinks.telegram} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="footer__social-link">
              <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12.5" cy="12.5" r="12.5" fill="#F5A2B7"/>
                <path d="M17.5 8L15.8 17.1C15.8 17.1 15.6 17.6 15 17.3L11.2 14.4L9.8 13.7L7.2 12.9C7.2 12.9 6.8 12.7 6.8 12.4C6.8 12 7.2 11.9 7.2 11.9L16.7 8.2C16.7 8.2 17.5 7.8 17.5 8Z" fill="white"/>
              </svg>
            </a>
            <a href={externalLinks.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="footer__social-link">
              <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12.5" cy="12.5" r="12.5" fill="#F5A2B7"/>
                <path d="M17.2 7.7C16 6.5 14.3 5.8 12.5 5.8C8.8 5.8 5.8 8.8 5.8 12.5C5.8 13.7 6.1 14.8 6.7 15.8L5.7 19.2L9.2 18.2C10.2 18.7 11.3 19 12.5 19C16.2 19 19.2 16 19.2 12.3C19.2 10.5 18.4 8.9 17.2 7.7Z" fill="white"/>
              </svg>
            </a>
          </div>
          <a href={externalLinks.phoneTel} className="footer__phone">{externalLinks.phoneDisplay}</a>

          <div className="footer__legal">
            <a href={externalLinks.offer} target="_blank" rel="noopener noreferrer" className="footer__legal-link">Оферта</a>
            <a href={externalLinks.privacy} target="_blank" rel="noopener noreferrer" className="footer__legal-link">Политика обработки персональных данных</a>
            <p className="footer__legal-text">
              Самозанятая Алябьева Ольга Викторовна<br />
              ИНН: 505002412789
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
