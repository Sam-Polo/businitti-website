import './RecommendationsPage.css'

const tips = [
  'Избегайте контакта украшений с водой, парфюмом и косметическими средствами',
  'Берегите от воздействия прямых солнечных лучей',
  'Храните в индивидуальной упаковке в горизонтальном положении',
  'После носки протирайте украшения мягкой безворсовой тканью',
]

export default function RecommendationsPage() {
  return (
    <main className="recommendations-page">
      <div className="recommendations-page__content">
        <section className="recommendations-section">
          <div className="recommendations-header">
            <div className="recommendations-header__top">
              <h1 className="recommendations-header__title">
                Рекомендации по уходу
              </h1>
              <p className="recommendations-header__subtitle">
                Наши изделия будут радовать вас долго<br />
                при соблюдении следующих рекомендаций:
              </p>
            </div>

            <div className="recommendations-tips">
              <hr className="recommendations-tips__line" />
              {tips.map((tip, i) => (
                <div key={i}>
                  <p className="recommendations-tips__item">{tip}</p>
                  <hr className="recommendations-tips__line" />
                </div>
              ))}
            </div>
          </div>

          <div className="recommendations-image" />
        </section>
      </div>
    </main>
  )
}
