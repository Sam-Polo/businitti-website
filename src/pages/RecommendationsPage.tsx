import { Fragment } from 'react'
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
        <section className="recommendations-section reveal">
          <div className="recommendations-header">
            <div className="recommendations-header__top">
              <h1 className="recommendations-header__title">
                Рекомендации по уходу
              </h1>
              <p className="recommendations-header__subtitle">
                Наши изделия будут радовать вас долго<br className="br--desktop" />
                {' '}при соблюдении следующих рекомендаций:
              </p>
            </div>

            <div className="recommendations-tips">
              <hr className="recommendations-tips__line" />
              {tips.map((tip, i) => (
                <Fragment key={i}>
                  <div className="recommendations-tips__item-wrap">
                    <p className="recommendations-tips__item">{tip}</p>
                  </div>
                  <hr className="recommendations-tips__line" />
                </Fragment>
              ))}
            </div>
          </div>

          <div className="recommendations-image" />
        </section>
      </div>
    </main>
  )
}
