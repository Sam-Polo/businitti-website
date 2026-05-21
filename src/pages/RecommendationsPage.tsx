import { Fragment } from 'react'
import { useSiteContent } from '../contexts/SiteContentContext'
import { RichText } from '../lib/RichText'
import { RevealImage } from '../lib/RevealImage'
import imageDefault from '../assets/img/recommendations-image.png'
import './RecommendationsPage.css'

const TIP_DEFAULTS = [
  'Избегайте контакта украшений с водой, парфюмом и косметическими средствами',
  'Берегите от воздействия прямых солнечных лучей',
  'Храните в индивидуальной упаковке в горизонтальном положении',
  'После носки протирайте украшения мягкой безворсовой тканью',
]

export default function RecommendationsPage() {
  const image = useSiteContent('recommendations.image', imageDefault)
  const tip1 = useSiteContent('recommendations.tip_1', TIP_DEFAULTS[0])
  const tip2 = useSiteContent('recommendations.tip_2', TIP_DEFAULTS[1])
  const tip3 = useSiteContent('recommendations.tip_3', TIP_DEFAULTS[2])
  const tip4 = useSiteContent('recommendations.tip_4', TIP_DEFAULTS[3])
  const tips = [tip1, tip2, tip3, tip4]
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
                    <RichText text={tip} paragraphClassName="recommendations-tips__item" />
                  </div>
                  <hr className="recommendations-tips__line" />
                </Fragment>
              ))}
            </div>
          </div>

          <RevealImage className="recommendations-image reveal" src={image} alt="" />
        </section>
      </div>
    </main>
  )
}
