import { useSiteContent } from '../contexts/SiteContentContext'
import { RichText } from '../lib/RichText'
import { RevealImage } from '../lib/RevealImage'
import heroDefault from '../assets/img/about-hero__img.jpg'
import gallery1Default from '../assets/img/about-gallery__img1.jpg'
import gallery2Default from '../assets/img/about-gallery__img2.jpg'
import './AboutPage.css'

const ABOUT_HERO_BUDDY_DEFAULT =
  '[[BUSINITTI (Бусинити)]]\n\n— это авторские украшения ручной работы из натуральных камней и минералов.\n\nМы создаём не просто аксессуары, а украшения со смыслом — те, что тонко дополняют образ и становятся его продолжением.\n\nКаждое изделие может стать вашим личным символом: оберегом в непростые дни, талисманом, придающим уверенность на новом этапе, или тихим напоминанием о пути к мечте.'

const ABOUT_GALLERY_TEXT_DEFAULT =
  'Мы верим, что красота — это не только внешний блеск, но и внутреннее ощущение. Именно поэтому в каждое украшение мы вкладываем внимание к деталям, энергию и любовь.\n\nДавайте создавать красоту со смыслом вместе.'

const ABOUT_CLOSING_DEFAULT = 'С любовью к вам,\nBUSINITTI'

export default function AboutPage() {
  const heroImg = useSiteContent('about.hero_image', heroDefault)
  const gallery1 = useSiteContent('about.gallery_image_1', gallery1Default)
  const gallery2 = useSiteContent('about.gallery_image_2', gallery2Default)
  const heroBuddy = useSiteContent('about.hero_buddy_text', ABOUT_HERO_BUDDY_DEFAULT)
  const galleryText = useSiteContent('about.gallery_text', ABOUT_GALLERY_TEXT_DEFAULT)
  const closingText = useSiteContent('about.closing_text', ABOUT_CLOSING_DEFAULT)

  return (
    <main className="about-page">
      <div className="about-page__content">
        <h1 className="about-hero__title">О бренде</h1>

        <div className="about-grid reveal">
          <div className="about-hero__buddy">
            <RichText text={heroBuddy} />
          </div>
          <RevealImage className="about-hero__img reveal" src={heroImg} alt="" />
          <RevealImage className="about-gallery__img about-gallery__img--1 reveal" src={gallery1} alt="" />
          <RevealImage className="about-gallery__img about-gallery__img--2 reveal" src={gallery2} alt="" />
        </div>

        <div className="about-closing-block reveal">
          <div className="about-gallery__text">
            <RichText text={galleryText} />
          </div>
          <div className="about-closing">
            <RichText text={closingText} />
          </div>
        </div>
      </div>
    </main>
  )
}
