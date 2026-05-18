import { useSiteContent } from '../contexts/SiteContentContext'
import heroDefault from '../assets/img/about-hero__img.jpg'
import gallery1Default from '../assets/img/about-gallery__img1.jpg'
import gallery2Default from '../assets/img/about-gallery__img2.jpg'
import './AboutPage.css'

export default function AboutPage() {
  const heroImg = useSiteContent('about.hero_image', heroDefault)
  const gallery1 = useSiteContent('about.gallery_image_1', gallery1Default)
  const gallery2 = useSiteContent('about.gallery_image_2', gallery2Default)

  return (
    <main className="about-page">
      <div className="about-page__content">
        <h1 className="about-hero__title">О бренде</h1>

        <div className="about-grid reveal">
          <div className="about-hero__buddy">
            <p>
              <span className="about-hero__brand">BUSINITTI (Бусинити)</span>
            </p>
            <p>
              — это авторские украшения ручной работы
              из натуральных камней и минералов.
            </p>
            <p>
              Мы создаём не просто аксессуары, а украшения
              со смыслом — те, что тонко дополняют образ
              и становятся его продолжением.
            </p>
            <p>
              Каждое изделие может стать вашим личным символом:
              оберегом в непростые дни, талисманом, придающим
              уверенность на новом этапе, или тихим напоминанием
              о пути к мечте.
            </p>
          </div>
          <div className="about-hero__img reveal" style={{ backgroundImage: `url(${heroImg})` }} />
          <div className="about-gallery__img about-gallery__img--1 reveal" style={{ backgroundImage: `url(${gallery1})` }} />
          <div className="about-gallery__img about-gallery__img--2 reveal" style={{ backgroundImage: `url(${gallery2})` }} />
        </div>

        <div className="about-closing-block reveal">
          <div className="about-gallery__text">
            <p>
              Мы верим, что красота — это не только внешний блеск,
              но и внутреннее ощущение. Именно поэтому в каждое
              украшение мы вкладываем внимание к деталям, энергию
              и любовь.
            </p>
            <p>
              Давайте создавать красоту со смыслом вместе.
            </p>
          </div>
          <p className="about-closing">
            С любовью к вам,<br />BUSINITTI
          </p>
        </div>
      </div>
    </main>
  )
}
