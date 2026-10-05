import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuroraBackground, BrandLogo, CountUp, Reveal, accentFor, inr, useProducts } from '../customer/shared.jsx';

export const NAV_LINKS = [
  { id: 'products', label: 'Products' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'why', label: 'Why Pragati' },
];

const STEPS = [
  { icon: 'grid_view', title: 'Pick your products', text: 'Browse the Pragati suite and choose the tools that fit your business.' },
  { icon: 'badge', title: 'Tell us about you', text: 'Share your business details and pick a workspace name — it takes a minute.' },
  { icon: 'lock', title: 'Pay securely', text: 'Pay by card, UPI or net banking with a transparent, GST-inclusive summary.' },
  { icon: 'key', title: 'Get your login', text: 'Receive your credentials instantly and start using your products right away.' },
];

const BENEFITS = [
  { icon: 'bolt', title: 'Live in minutes', text: 'No sales calls or paperwork. Register, pay and your workspace is provisioned automatically.' },
  { icon: 'verified_user', title: 'Secure by design', text: 'Encrypted credentials, isolated workspaces and safe payment handling you can trust.' },
  { icon: 'receipt_long', title: 'GST-ready billing', text: 'Clear pricing with GST breakdown, monthly or yearly plans, and savings on annual billing.' },
  { icon: 'hub', title: 'One account, many tools', text: 'Add more Pragati products as you grow — all under the same single sign-on identity.' },
];

export function scrollToId(id) {
  if (window.location.pathname !== '/') {
    window.location.href = `/#${id}`;
    return;
  }
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const go = (id) => { setOpen(false); scrollToId(id); };

  return (
    <header className={`lp-nav${scrolled ? ' lp-nav-scrolled' : ''}`}>
      <div className="lp-nav-inner" style={{ padding: '0 48px', width: '100%', maxWidth: 'none' }}>
        <BrandLogo size={64} textSize="38px" />
        <nav className={`lp-nav-links${open ? ' lp-nav-links-open' : ''}`} aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <button key={l.id} className="lp-nav-link" onClick={() => go(l.id)}>{l.label}</button>
          ))}
          <Link to="/contact" className="lp-nav-link">Contact us</Link>
          <button className="lp-btn lp-btn-primary lp-nav-cta-mobile" onClick={() => navigate('/register')}>
            Get started
          </button>
        </nav>
        <div className="lp-nav-actions">
          <button id="nav-get-started" className="lp-btn lp-btn-primary lp-nav-cta" onClick={() => navigate('/register')}>
            Get started
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <button
            className="lp-burger"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="material-symbols-outlined">{open ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function Hero({ products, loading }) {
  const navigate = useNavigate();
  const preview = products.slice(0, 3);

  return (
    <section className="lp-hero">
      <div className="lp-container lp-hero-grid">
        <div className="lp-hero-copy">
          <span className="lp-pill lp-fade-up" style={{ animationDelay: '60ms' }}>
            <span className="lp-pill-dot" /> Self-service onboarding · No waiting
          </span>
          <h1 className="lp-h1 lp-fade-up" style={{ animationDelay: '140ms' }}>
            One platform for <span className="lp-gradient-text">every tool</span> your business runs on
          </h1>
          <p className="lp-lead lp-fade-up" style={{ animationDelay: '220ms' }}>
            Explore the Pragati product suite, register your business in minutes and get your login
            credentials the moment your payment completes.
          </p>
          <div className="lp-hero-ctas lp-fade-up" style={{ animationDelay: '300ms' }}>
            <button id="hero-get-started" className="lp-btn lp-btn-primary lp-btn-lg" onClick={() => navigate('/register')}>
              Get started
              <span className="material-symbols-outlined">rocket_launch</span>
            </button>
            <button className="lp-btn lp-btn-ghost lp-btn-lg" onClick={() => scrollToId('products')}>
              Explore products
              <span className="material-symbols-outlined">expand_more</span>
            </button>
          </div>

        </div>

        <div className="lp-hero-visual lp-fade-up" style={{ animationDelay: '260ms' }} aria-hidden="true">
          <div className="lp-float-chip lp-chip-a">
            <span className="material-symbols-outlined" style={{ color: '#34b98a' }}>check_circle</span>
            <div><b>Payment successful</b><small>Order confirmed</small></div>
          </div>
          <div className="lp-float-chip lp-chip-b">
            <span className="material-symbols-outlined" style={{ color: '#f2a93b' }}>key</span>
            <div><b>Credentials ready</b><small>Sign in now</small></div>
          </div>

          <div className="lp-mock">
            <div className="lp-mock-top">
              <span /><span /><span />
              <em>your-workspace.pragati</em>
            </div>
            <div className="lp-mock-body">
              <div className="lp-mock-title">Your products</div>
              {(loading ? [0, 1, 2] : preview).map((p, i) => (
                <div key={p._id || i} className="lp-mock-row" style={{ '--c': accentFor(i), animationDelay: `${600 + i * 160}ms` }}>
                  <span className="lp-mock-ico material-symbols-outlined">{p.icon || 'apps'}</span>
                  <div className="lp-mock-lines">
                    <b>{p.name || <i className="lp-skel" style={{ width: 90 }} />}</b>
                    <i className="lp-mock-bar"><i style={{ width: `${62 + i * 14}%` }} /></i>
                  </div>
                  <span className="lp-mock-badge">Active</span>
                </div>
              ))}
              <div className="lp-mock-foot">
                <span className="lp-pulse-dot" /> Provisioned automatically
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsStrip({ count }) {
  return (
    <Reveal className="lp-container">
      <div className="lp-stats">
        <div className="lp-stat">
          <div className="lp-stat-icon"><span className="material-symbols-outlined">inventory_2</span></div>
          <b><CountUp to={count} /></b>
          <span>Products available</span>
        </div>
        <div className="lp-stat">
          <div className="lp-stat-icon"><span className="material-symbols-outlined">timer</span></div>
          <b><CountUp to={5} prefix="<" suffix=" min" /></b>
          <span>Typical setup time</span>
        </div>
        <div className="lp-stat">
          <div className="lp-stat-icon"><span className="material-symbols-outlined">payments</span></div>
          <b><CountUp to={3} /></b>
          <span>Ways to pay</span>
        </div>
        <div className="lp-stat">
          <div className="lp-stat-icon"><span className="material-symbols-outlined">cloud_done</span></div>
          <b><CountUp to={100} suffix="%" /></b>
          <span>Cloud based</span>
        </div>
      </div>
    </Reveal>
  );
}

function ProductCard({ p, i }) {
  const navigate = useNavigate();
  const features = p.features || [];
  const [imgFailed, setImgFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const showImage = !!p.image && !imgFailed;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <Reveal delay={(i % 3) * 90} className="lp-pcard-wrap">
      <article 
        className="lp-pcard" 
        style={{ '--c': accentFor(i), cursor: 'pointer' }} 
        onMouseMove={onMove}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="lp-pcard-glow" />
        <div className={`lp-pcard-media${showImage ? '' : ' lp-pcard-media-fallback'}`}>
          {showImage
            ? <img src={p.image} alt={p.name} loading="lazy" onError={() => setImgFailed(true)} />
            : <span className="material-symbols-outlined">{p.icon || 'apps'}</span>}
        </div>
        <h3>{p.name}</h3>
        <p className="lp-pcard-desc">{p.description || 'A powerful tool from the Pragati suite.'}</p>
        
        {expanded && features.length > 0 && (
          <ul className="lp-pcard-features">
            {features.map((f, fi) => (
              <li key={fi}>
                <span className="material-symbols-outlined">check</span>
                {f}
              </li>
            ))}
          </ul>
        )}

        <div className="lp-pcard-foot">
          <div className="lp-price">
            <b>{p.price > 0 ? inr(p.price) : 'Free'}</b>
            {p.price > 0 && <small>/ month</small>}
          </div>
          <button
            id={`subscribe-${p.slug}`}
            className="lp-btn lp-btn-soft"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/register?product=${encodeURIComponent(p.slug)}`);
            }}
          >
            Subscribe
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        
        {features.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '16px', opacity: 0.6 }}>
            <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--lp-ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {expanded ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
              </span>
              {expanded ? 'Show less' : 'View details'}
            </span>
          </div>
        )}
      </article>
    </Reveal>
  );
}

function ProductsSection({ products, loading, error, reload }) {
  return (
    <section id="products" className="lp-section">
      <div className="lp-container">
        <Reveal className="lp-section-head">
          <span className="lp-eyebrow">Our products</span>
          <h2 className="lp-h2">Everything you need, <span className="lp-gradient-text">ready to subscribe</span></h2>
          <p className="lp-sub">Pick one product or combine several. Add more any time as your business grows.</p>
        </Reveal>

        {loading && (
          <div className="lp-grid">
            {[0, 1, 2].map((k) => (
              <div key={k} className="lp-pcard lp-pcard-skel">
                <i className="lp-skel" style={{ width: 52, height: 52, borderRadius: 16 }} />
                <i className="lp-skel" style={{ width: '55%', height: 22 }} />
                <i className="lp-skel" style={{ width: '90%' }} />
                <i className="lp-skel" style={{ width: '80%' }} />
                <i className="lp-skel" style={{ width: '70%' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="lp-state">
            <span className="material-symbols-outlined">cloud_off</span>
            <p>{error}</p>
            <button className="lp-btn lp-btn-soft" onClick={reload}>Try again</button>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="lp-state">
            <span className="material-symbols-outlined">inventory_2</span>
            <p>New products are on the way. Please check back soon.</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="lp-grid">
            {products.map((p, i) => <ProductCard key={p._id || p.slug} p={p} i={i} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="lp-section lp-section-tint">
      <div className="lp-container">
        <Reveal className="lp-section-head">
          <span className="lp-eyebrow">How it works</span>
          <h2 className="lp-h2">From sign-up to sign-in in <span className="lp-gradient-text">four easy steps</span></h2>
        </Reveal>
        <div className="lp-steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 110} className="lp-step">
              <div className="lp-step-num">{i + 1}</div>
              <div className="lp-step-icon"><span className="material-symbols-outlined">{s.icon}</span></div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Why() {
  return (
    <section id="why" className="lp-section">
      <div className="lp-container">
        <Reveal className="lp-section-head">
          <span className="lp-eyebrow">Why Pragati</span>
          <h2 className="lp-h2">Built to get you <span className="lp-gradient-text">running faster</span></h2>
        </Reveal>
        <div className="lp-benefits">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={i * 90} className="lp-benefit">
              <span className="lp-benefit-icon"><span className="material-symbols-outlined">{b.icon}</span></span>
              <div>
                <h3>{b.title}</h3>
                <p>{b.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBanner() {
  const navigate = useNavigate();
  return (
    <section className="lp-section lp-cta-section">
      <Reveal className="lp-container">
        <div className="lp-cta">
          <span className="lp-cta-orb lp-cta-orb-1" />
          <span className="lp-cta-orb lp-cta-orb-2" />
          <h2>Ready to take your business forward?</h2>
          <p>Create your workspace today and get your credentials in just a few minutes.</p>
          <button id="cta-get-started" className="lp-btn lp-btn-white lp-btn-lg" onClick={() => navigate('/register')}>
            Create my account
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-glow" aria-hidden="true" />
      <div className="lp-container lp-footer-inner">
        <div className="lp-footer-brand">
          <BrandLogo size={64} textSize="38px" />
          <p>Pragati by Techhansa — a connected suite of business products, onboarded in minutes.</p>
          <div className="lp-footer-chips">
            <span><i className="material-symbols-outlined">bolt</i>Instant setup</span>
            <span><i className="material-symbols-outlined">lock</i>Secure payments</span>
            <span><i className="material-symbols-outlined">cloud_done</i>Cloud based</span>
          </div>
        </div>
        <div className="lp-footer-links">
          <b>Explore</b>
          {NAV_LINKS.map((l) => (
            <button key={l.id} onClick={() => scrollToId(l.id)}>
              <i className="material-symbols-outlined">arrow_outward</i>{l.label}
            </button>
          ))}
          <Link to="/contact"><i className="material-symbols-outlined">arrow_outward</i>Contact us</Link>
          <Link to="/register"><i className="material-symbols-outlined">arrow_outward</i>Get started</Link>
        </div>
        <div className="lp-footer-admin">
          <b>Team access</b>
          <div className="lp-admin-card">
            <span className="lp-admin-ico"><i className="material-symbols-outlined">admin_panel_settings</i></span>
            <p>Manage products, customers and billing from the control panel.</p>
            <Link id="admin-login-btn" to="/login" className="lp-btn lp-btn-outline">
              Admin Login
              <span className="material-symbols-outlined">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
      <div className="lp-container lp-footer-bottom">
        <span>© {new Date().getFullYear()} Techhansa. All rights reserved.</span>
        <span>Made with <span className="lp-heart">♥</span> in India</span>
        <button className="lp-totop" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="material-symbols-outlined">keyboard_arrow_up</span>
        </button>
      </div>
    </footer>
  );
}

export default function Landing() {
  const { products, loading, error, reload } = useProducts();

  useEffect(() => {
    document.title = 'Pragati — Business products, onboarded in minutes';
    return () => { document.title = 'Pragati Control Plane'; };
  }, []);

  return (
    <div className="lp-root">
      <AuroraBackground />
      <Navbar />
      <main>
        <Hero products={products} loading={loading} />
        <StatsStrip count={products.length} />
        <ProductsSection products={products} loading={loading} error={error} reload={reload} />
        <HowItWorks />
        <Why />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
