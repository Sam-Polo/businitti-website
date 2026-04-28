import './AboutPage.css'

export default function AboutPage() {
  return (
    <main className="about-page">
      <div className="about-page__content">
        {/* Section 1: Title + Text + Image */}
        <section className="about-hero">
          <div className="about-hero__text">
            <h1 className="about-hero__title">О бренде</h1>
            <div className="about-hero__body">
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
          </div>
          <div className="about-hero__image" />
        </section>

        {/* Section 2: Gallery + Text */}
        <section className="about-gallery">
          <div className="about-gallery__images">
            <div className="about-gallery__img" />
            <div className="about-gallery__img" />
          </div>
          <div className="about-gallery__text">
            <p>
              Мы верим, что красота — это не только внешний блеск,
              но и внутреннее ощущение. Именно поэтому в каждое
              украшение мы вкладываем внимание к деталям, энергию
              и любовь.
            </p>
            <p>&nbsp;</p>
            <p>
              Давайте создавать красоту со смыслом вместе.
            </p>
          </div>
          <p className="about-closing">
            С любовью к вам,<br />BUSINITTI
          </p>
        </section>
      </div>
    </main>
  )
}
