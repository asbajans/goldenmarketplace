import React, { useState, useEffect } from 'react';
import './App.css';

/* ─── Types ──────────────────────────────────────────────────── */
interface Feature {
  icon: string;
  title: string;
  desc: string;
}

interface Plan {
  name: string;
  price: string;
  period: string;
  highlight: boolean;
  features: string[];
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

const PLANS: Plan[] = [
  {
    name: 'Başlangıç',
    price: '₺790',
    period: '/ ay',
    highlight: false,
    features: ['5 ürüne kadar', '2 pazaryeri', 'B2B Ürün Keşfet', 'E-posta destek']
  },
  {
    name: 'Profesyonel',
    price: '₺1.990',
    period: '/ ay',
    highlight: true,
    features: ['Sınırsız ürün', 'Tüm pazaryerleri', 'B2B talep yönetimi', 'Etsy entegrasyonu', 'Öncelikli destek']
  },
  {
    name: 'Kurumsal',
    price: 'Teklif Al',
    period: '',
    highlight: false,
    features: ['Özel API limitleri', 'Beyaz etiket seçeneği', 'Özel entegrasyonlar', 'SLA garantili destek']
  }
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

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setActiveSection(id);
  };

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
          <div className="pricing-grid">
            {PLANS.map((plan, i) => (
              <div key={i} className={`pricing-card ${plan.highlight ? 'pricing-card--highlight' : ''}`}>
                {plan.highlight && <div className="pricing-card__badge">En Popüler</div>}
                <div className="pricing-card__name">{plan.name}</div>
                <div className="pricing-card__price">
                  {plan.price}
                  {plan.period && <span className="pricing-card__period">{plan.period}</span>}
                </div>
                <ul className="pricing-card__features">
                  {plan.features.map((f, fi) => (
                    <li key={fi}>✓ {f}</li>
                  ))}
                </ul>
                <a
                  href={plan.price === 'Teklif Al' ? 'mailto:info@asb.web.tr' : 'https://seller.asb.web.tr/register'}
                  className={`btn btn--block ${plan.highlight ? 'btn--gold' : 'btn--outline'}`}
                >
                  {plan.price === 'Teklif Al' ? 'İletişime Geç' : 'Hemen Başla'}
                </a>
              </div>
            ))}
          </div>
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
