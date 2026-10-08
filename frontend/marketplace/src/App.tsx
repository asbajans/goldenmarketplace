import React, { useState, useEffect } from 'react';
import './App.css';
import { getSubscriptionPlans, type SubscriptionPlan } from './api/subscription';

/* ─── Types ──────────────────────────────────────────────────── */
interface Feature {
  icon: string;
  title: string;
  desc: string;
}

/* ─── Data ───────────────────────────────────────────────────── */
const FEATURES: Feature[] = [
  { icon: '🤝', title: 'B2B Satış & Onay Akışı', desc: 'Satıcılar birbirlerinin ürünlerini kendi mağazalarına ekleyebilir. Stok sahibi her talebi onaylar veya reddeder.' },
  { icon: '💰', title: 'Çift Fiyat Sistemi', desc: 'Her ürün için ayrı satış fiyatı ve B2B fiyatı tanımlayın. İskonto oranı otomatik hesaplanır.' },
  { icon: '📈', title: 'Gerçek Zamanlı Altın Fiyatı', desc: 'Gram, milyem ve kâr marjı girince fiyat anında güncellenir. Pazaryerlerine otomatik senkronize edilir.' },
  { icon: '🛒', title: 'Çoklu Pazaryeri Entegrasyonu', desc: 'Trendyol, Hepsiburada, N11, Amazon ve Pazarama entegrasyonlarıyla tek panelden yönetin.' },
  { icon: '🧵', title: 'Etsy Mağaza Yönetimi', desc: 'Etsy mağazanızdaki ürünleri, kategorileri ve stoklarınızı ASB paneli üzerinden kolayca yapılandırın.' },
  { icon: '🔒', title: 'Sadece B2B — Kamuya Kapalı', desc: 'Platform sadece onaylı satıcılara açıktır. Müşteri girişi yoktur; tüm satışlar B2B modelinde gerçekleşir.' },
];

const ETSY_STEPS = [
  { step: '01', title: 'Etsy Geliştirici Hesabı Açın', desc: 'etsy.com/developers adresinden ücretsiz geliştirici hesabı oluşturun ve API anahtarınızı alın.' },
  { step: '02', title: 'API Anahtarını ASB\'ye Girin', desc: 'Seller Panel → Entegrasyonlar bölümünden Etsy bölümüne gidin, API anahtarınızı yapıştırın.' },
  { step: '03', title: 'Mağaza Erişimini Yetkilendirin', desc: 'OAuth akışıyla Etsy mağazanıza okuma/yazma izni verin. İşlem birkaç dakika sürer.' },
  { step: '04', title: 'Ürün & Kategori Eşleştirin', desc: 'ASB ürünlerinizi Etsy kategorileriyle eşleştirin. Stok ve başlık bilgileri panelinizdeki ürünlerden çekilir.' },
];

/* ─── Component ──────────────────────────────────────────────── */
const App: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  // Paketler admin panelden (Abonelikler) canlı çekilir
  const [plans, setPlans] = useState<SubscriptionPlan[] | null>(null);
  const [plansError, setPlansError] = useState(false);
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    getSubscriptionPlans()
      .then(setPlans)
      .catch(() => setPlansError(true));
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActiveSection(id);
  };

  // Plandaki modül/limit alanlarından görünen özellik listesi kurulur
  const planFeatures = (plan: SubscriptionPlan): string[] => {
    const list: string[] = [];
    list.push(`${plan.productLimit} ürüne kadar`);
    list.push(`${plan.integrationLimit} pazaryeri entegrasyonu`);
    if (plan.b2bEnabled) list.push('B2B erişimi ve ürün kopyalama');
    if (plan.bulkUploadEnabled) list.push('Toplu ürün yükleme');
    if ((plan.maxExternalFeeds || 0) > 0) list.push(`${plan.maxExternalFeeds} harici feed`);
    if (plan.aiTranslationEnabled || plan.aiContentEnabled) {
      list.push(plan.aiMonthlyCredit ? `AI özellikleri (ayda ${plan.aiMonthlyCredit} kredi hediyeli)` : 'AI özellikleri');
    }
    if (Array.isArray(plan.features)) {
      for (const f of plan.features) {
        if (f && !list.includes(f)) list.push(f);
      }
    }
    return list;
  };

  const planPrice = (plan: SubscriptionPlan): number =>
    period === 'yearly' ? Number(plan.yearlyPrice) : Number(plan.monthlyPrice);

  return (
    <div className="landing">
      {/* ── NAVBAR ── */}
      <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
        <div className="navbar__brand">
          <span className="brand-icon">🏅</span>
          <span className="brand-name">ASB Platform</span>
        </div>
        <div className="navbar__links">
          {[
            { id: 'features', label: 'Özellikler' },
            { id: 'etsy', label: 'Etsy' },
            { id: 'pricing', label: 'Fiyatlar' }
          ].map(l => (
            <button
              key={l.id}
              className={`nav-link ${activeSection === l.id ? 'nav-link--active' : ''}`}
              onClick={() => scrollTo(l.id)}
            >
              {l.label}
            </button>
          ))}
        </div>
        <a href="https://seller.asb.web.tr" className="btn btn--primary btn--sm">
          Satıcı Girişi →
        </a>
      </nav>

      {/* ── HERO ── */}
      <section id="hero" className="hero">
        <div className="hero__glow hero__glow--1" />
        <div className="hero__glow hero__glow--2" />
        <div className="hero__content">
          <div className="hero__badge">🔐 Yalnızca B2B · Onaylı Satıcılara Özel</div>
          <h1 className="hero__title">
            Kuyumcular için<br />
            <span className="hero__gradient">B2B e-Ticaret</span><br />
            Altyapısı
          </h1>
          <p className="hero__subtitle">
            Altın takı satıcıları için tasarlanmış B2B platform. Çift fiyat yönetimi,
            Etsy mağaza entegrasyonu ve satıcılar arası onaylı listeleme sistemi tek çatıda.
          </p>
          <div className="hero__actions">
            <a href="https://seller.asb.web.tr/register" className="btn btn--gold btn--lg">
              Ücretsiz Başla
            </a>
            <button className="btn btn--ghost btn--lg" onClick={() => scrollTo('features')}>
              Özellikleri Keşfet ↓
            </button>
          </div>
          <div className="hero__stats">
            {[
              { value: 'B2B', label: 'Sadece satıcıdan satıcıya' },
              { value: '6+', label: 'Pazaryeri entegrasyonu' },
              { value: '7/24', label: 'Gerçek zamanlı fiyat' },
            ].map(s => (
              <div key={s.label} className="stat">
                <span className="stat__value">{s.value}</span>
                <span className="stat__label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hero__visual">
          <div className="dashboard-mockup">
            <div className="mockup__header">
              <div className="mockup__dots">
                <span /><span /><span />
              </div>
              <span className="mockup__title">seller.asb.web.tr</span>
            </div>
            <div className="mockup__body">
              <div className="mockup__sidebar">
                {['Panel', 'Ürünler', 'B2B Keşfet ✦', 'B2B Talepleri', 'Entegrasyonlar'].map((item, i) => (
                  <div key={i} className={`mockup__menu-item ${i === 2 ? 'active' : ''}`}>{item}</div>
                ))}
              </div>
              <div className="mockup__main">
                <div className="mockup__card">
                  <div className="product-row">
                    <div className="product-thumb" />
                    <div className="product-info">
                      <div className="product-title" />
                      <div className="product-prices">
                        <span className="price price--sale">₺4.250 <del className="opacity-50">satış</del></span>
                        <span className="price price--b2b">₺3.400 B2B</span>
                      </div>
                    </div>
                    <div className="product-btn">Mağazama Ekle</div>
                  </div>
                  <div className="product-row dimmed">
                    <div className="product-thumb thumb-2" />
                    <div className="product-info">
                      <div className="product-title w70" />
                      <div className="product-prices">
                        <span className="price price--sale">₺8.100 <del className="opacity-50">satış</del></span>
                        <span className="price price--b2b">₺6.480 B2B</span>
                      </div>
                    </div>
                    <div className="product-btn approved">✓ Onaylandı</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="section section--dark">
        <div className="section__inner">
          <div className="section__label">Platform Özellikleri</div>
          <h2 className="section__title">Her ihtiyacınız tek platformda</h2>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-card__icon">{f.icon}</div>
                <h3 className="feature-card__title">{f.title}</h3>
                <p className="feature-card__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ETSY INTEGRATION ── */}
      <section id="etsy" className="section section--etsy">
        <div className="section__inner">
          <div className="etsy-header">
            <div>
              <div className="section__label etsy-label">Etsy Mağaza Entegrasyonu</div>
              <h2 className="section__title">Etsy mağazanızı<br />ASB panelinden yönetin</h2>
              <p className="etsy-disclaimer">
                ASB, <strong>Etsy API'sini</strong> kullanan bağımsız bir yazılım platformudur.
                Etsy Inc. tarafından sponsorlanmaz veya onaylanmaz. Tüm entegrasyonlar
                <a href="https://www.etsy.com/developers/documentation/getting_started/policy" target="_blank" rel="noopener noreferrer"> Etsy Geliştirici Politikası</a>'na uygun şekilde gerçekleştirilir.
              </p>
              <div className="etsy-capabilities">
                {[
                  '📦 Ürün listelemelerini görüntüleme ve düzenleme',
                  '📁 Kategori ve bölüm yönetimi',
                  '📊 Stok bilgilerini takip etme',
                  '🔁 Başlık ve açıklama güncelleme',
                ].map((c, i) => (
                  <div key={i} className="etsy-cap-item">
                    <span>{c}</span>
                  </div>
                ))}
              </div>
              <div className="etsy-note">
                <strong>⚠️ Not:</strong> Etsy fiyatları ASB'den otomatik olarak değiştirilmez.
                Fiyat güncellemeleri Etsy satıcı panelinizden gerçekleştirilir. Bu,
                Etsy'nin API politikasına tam uyum gerektirir.
              </div>
            </div>
            <div className="etsy-steps">
              {ETSY_STEPS.map((s, i) => (
                <div key={i} className="etsy-step">
                  <div className="etsy-step__num">{s.step}</div>
                  <div>
                    <div className="etsy-step__title">{s.title}</div>
                    <div className="etsy-step__desc">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="section section--dark">
        <div className="section__inner">
          <div className="section__label">Fiyatlandırma</div>
          <h2 className="section__title">İşletmenize uygun plan seçin</h2>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <button
              className={`btn btn--sm ${period === 'monthly' ? 'btn--gold' : 'btn--ghost'}`}
              onClick={() => setPeriod('monthly')}
              style={{ marginRight: 8 }}
            >
              Aylık
            </button>
            <button
              className={`btn btn--sm ${period === 'yearly' ? 'btn--gold' : 'btn--ghost'}`}
              onClick={() => setPeriod('yearly')}
            >
              Yıllık
            </button>
          </div>
          {plans === null && !plansError && (
            <p style={{ textAlign: 'center', opacity: 0.7 }}>Paketler yükleniyor...</p>
          )}
          {plansError && (
            <p style={{ textAlign: 'center', opacity: 0.8 }}>
              Paketler şu an yüklenemedi. Güncel fiyatlar için{' '}
              <a href="https://seller.asb.web.tr/register" style={{ color: '#d4a017' }}>satıcı paneline göz atın</a>.
            </p>
          )}
          {plans !== null && plans.length > 0 && (
            <div className="pricing-grid">
              {plans.map((plan, i) => {
                const highlight = plans.length > 1 ? i === 1 : true;
                const price = planPrice(plan);
                return (
                  <div key={plan.id} className={`pricing-card ${highlight ? 'pricing-card--highlight' : ''}`}>
                    {highlight && <div className="pricing-card__badge">En Popüler</div>}
                    <div className="pricing-card__name">{plan.name}</div>
                    <div className="pricing-card__price">
                      {price > 0 ? `$${price}` : 'Ücretsiz'}
                      {price > 0 && (
                        <span className="pricing-card__period">/ {period === 'yearly' ? 'yıl' : 'ay'}</span>
                      )}
                    </div>
                    {plan.description && (
                      <p style={{ opacity: 0.75, fontSize: 14, margin: '0 0 12px' }}>{plan.description}</p>
                    )}
                    <ul className="pricing-card__features">
                      {planFeatures(plan).map((f, fi) => (
                        <li key={fi}>✓ {f}</li>
                      ))}
                    </ul>
                    <a
                      href="https://seller.asb.web.tr/register"
                      className={`btn btn--block ${highlight ? 'btn--gold' : 'btn--outline'}`}
                    >
                      Hemen Başla
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA BOTTOM ── */}
      <section className="cta-section">
        <div className="cta-section__inner">
          <h2 className="cta-section__title">Platformu denemeye hazır mısınız?</h2>
          <p className="cta-section__sub">14 gün ücretsiz, kredi kartı gerekmez.</p>
          <div className="cta-section__actions">
            <a href="https://seller.asb.web.tr/register" className="btn btn--gold btn--lg">
              Satıcı Hesabı Aç
            </a>
            <a href="https://admin.asb.web.tr" className="btn btn--ghost btn--lg">
              Admin Paneli
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="footer__inner">
          <div className="footer__brand">
            <span className="brand-icon">🏅</span>
            <span className="brand-name">ASB Platform</span>
          </div>
          <div className="footer__links">
            <a href="https://seller.asb.web.tr">Satıcı Paneli</a>
            <a href="https://admin.asb.web.tr">Admin Paneli</a>
            <a href="mailto:info@asb.web.tr">İletişim</a>
            <a href="https://www.etsy.com/developers/documentation/getting_started/policy" target="_blank" rel="noopener noreferrer">Etsy API Politikası</a>
          </div>
          <p className="footer__copy">
            © 2026 ASB Platform. Tüm hakları saklıdır. ASB, Etsy Inc. ile bağlantılı değildir.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
