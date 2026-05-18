import { useExternalLinks } from '../config/links'
import { useSiteContent } from '../contexts/SiteContentContext'
import { RichText } from '../lib/RichText'
import bgImageDefault from '../assets/img/home-contacts__image.png'
import './ContactsPage.css'

const CONTACTS_DESC_DEFAULT =
  'Мы стараемся, чтобы каждая покупка приносила радость. Если вы сомневаетесь в размере или хотите увидеть дополнительные фото украшения'

export default function ContactsPage() {
  const externalLinks = useExternalLinks()
  const bgImage = useSiteContent('contacts.bg_image', bgImageDefault)
  const desc = useSiteContent('contacts.desc', CONTACTS_DESC_DEFAULT)

  return (
    <main className="contacts-page">
      <div className="contacts-page__block">
        <div className="contacts-page__bg">
          <div className="contacts-page__bg-content" />
          <div className="contacts-page__bg-image" style={{ backgroundImage: `url(${bgImage})` }} />
        </div>

        <div className="contacts-page__inner">
          <div className="contacts-page__text">
            <h1 className="contacts-page__title">Контакты</h1>
            <div className="contacts-page__body">
              <RichText text={desc} paragraphClassName="contacts-page__desc" />
              <p className="contacts-page__cta-text">Напишите нам</p>
            </div>
          </div>
          <a
            href={externalLinks.contactsCtaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary"
          >
            {externalLinks.contactsCtaLabel}
          </a>
        </div>
      </div>
    </main>
  )
}
