import { externalLinks } from '../config/links'
import './ContactsPage.css'

export default function ContactsPage() {
  return (
    <main className="contacts-page">
      <div className="contacts-page__block">
        <div className="contacts-page__bg">
          <div className="contacts-page__bg-content" />
          <div className="contacts-page__bg-image" />
        </div>

        <div className="contacts-page__inner">
          <div className="contacts-page__text">
            <h1 className="contacts-page__title">Контакты</h1>
            <div className="contacts-page__body">
              <p>
                Мы стараемся, чтобы каждая покупка приносила радость.
                Если вы сомневаетесь в размере или хотите увидеть
                дополнительные фото украшения
              </p>
              <p className="contacts-page__cta-text">Напишите нам</p>
            </div>
          </div>
          <a
            href={externalLinks.max}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary"
          >
            MAX
          </a>
        </div>
      </div>
    </main>
  )
}
