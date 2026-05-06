import './AboutPage.css'

export default function AboutPage() {
  return (
    <main className="about-page">
      <div className="about-page__content">
        <h1 className="about-hero__title">О бренде</h1>

        <div className="about-grid">
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
          <div className="about-hero__img" />
          <div className="about-gallery__img about-gallery__img--1" />
          <div className="about-gallery__img about-gallery__img--2" />
        </div>

        <div className="about-closing-block">
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
