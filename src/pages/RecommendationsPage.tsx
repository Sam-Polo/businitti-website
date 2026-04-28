import './RecommendationsPage.css'

export default function RecommendationsPage() {
  return (
    <main className="recommendations-page">
      <div className="recommendations-page__content">
        <section className="recommendations-section">
          {/* Header */}
          <div className="recommendations-header">
            <div className="recommendations-header__top">
              <h1 className="recommendations-header__title">
                Рекомендации по уходу
              </h1>
              <div className="recommendations-header__desc">
                <p>
                  Украшения из натуральных камней — живые и чувствительные
                  к окружающей среде. Чтобы они радовали вас как можно дольше,
                  соблюдайте простые правила ухода.
                </p>
              </div>
            </div>

            {/* Tips */}
            <div className="recommendations-tips">
              <div className="recommendations-tips__group">
                <h2 className="recommendations-tips__subtitle">Хранение</h2>
                <div className="recommendations-tips__list">
                  <div className="recommendations-tips__item">
                    <p>
                      Храните украшения в закрытой шкатулке или мягком мешочке,
                      отдельно друг от друга
                    </p>
                  </div>
                  <div className="recommendations-tips__item">
                    <p>
                      Избегайте прямых солнечных лучей и повышенной влажности
                    </p>
                  </div>
                  <div className="recommendations-tips__item">
                    <p>
                      Не храните украшения в ванной комнате
                    </p>
                  </div>
                </div>
              </div>

              <div className="recommendations-tips__group">
                <h2 className="recommendations-tips__subtitle">Использование</h2>
                <div className="recommendations-tips__list">
                  <div className="recommendations-tips__item">
                    <p>
                      Снимайте украшения перед занятиями спортом,
                      водными процедурами и домашними делами
                    </p>
                  </div>
                  <div className="recommendations-tips__item">
                    <p>
                      Надевайте украшения после нанесения парфюма,
                      крема и макияжа
                    </p>
                  </div>
                  <div className="recommendations-tips__item">
                    <p>
                      Избегайте контакта с бытовой химией
                      и агрессивными средствами
                    </p>
                  </div>
                </div>
              </div>

              <div className="recommendations-tips__group">
                <h2 className="recommendations-tips__subtitle">Уход</h2>
                <div className="recommendations-tips__list">
                  <div className="recommendations-tips__item">
                    <p>
                      Протирайте украшения мягкой сухой тканью после ношения
                    </p>
                  </div>
                  <div className="recommendations-tips__item">
                    <p>
                      Не используйте абразивные средства для чистки
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom image */}
          <div className="recommendations-image" />
        </section>
      </div>
    </main>
  )
}
