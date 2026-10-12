import React, { useEffect, useState } from 'react';
import { AuroraBackground, Reveal, useProducts } from '../customer/shared.jsx';
import { Navbar, Footer } from './Landing.jsx';
import '../customer/customer.css';

export default function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', category: 'General', message: '' });
  const { products, loading } = useProducts();
  const [status, setStatus] = useState('');

  useEffect(() => {
    document.title = 'Contact Us — Pragati';
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const response = await fetch('/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setStatus('sent');
        setFormData({ name: '', email: '', category: 'General', message: '' });
        setTimeout(() => setStatus(''), 4000);
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.error || 'Something went wrong. Please try again.');
        setStatus('');
      }
    } catch (err) {
      alert('Network error. Please try again later.');
      setStatus('');
    }
  };

  return (
    <div className="lp-root">
      <AuroraBackground />
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - 400px)', padding: '60px 0 100px 0', position: 'relative', zIndex: 1 }}>
        <Reveal className="lp-container">
          <div className="lp-section-head" style={{ marginBottom: '48px', textAlign: 'center' }}>
            <span className="lp-badge">Get in touch</span>
            <h2>We're here to help.</h2>
            <p style={{ maxWidth: '600px', margin: '0 auto' }}>Have a doubt about Pragati? Need a custom solution? Reach out to our team and we'll get back to you promptly.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'start', maxWidth: '900px', margin: '0 auto' }}>
            
            <div className="lp-contact-card" style={{ background: '#1a2a3a', border: '1px solid #334155', borderRadius: '20px', padding: '40px', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label htmlFor="name" className="lp-contact-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f8fafc', fontSize: '14px' }}>Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="Your full name"
                    value={formData.name}
                    onChange={handleChange}
                    className="lp-contact-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#ffffff', fontSize: '15px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--lp-brand)'; e.target.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.2)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label htmlFor="email" className="lp-contact-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f8fafc', fontSize: '14px' }}>Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="lp-contact-input"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#ffffff', fontSize: '15px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--lp-brand)'; e.target.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.2)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label htmlFor="category" className="lp-contact-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f8fafc', fontSize: '14px' }}>Category</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      id="category"
                      name="category"
                      required
                      value={formData.category}
                      onChange={handleChange}
                      className="lp-contact-select"
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 16px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        fontSize: '15px',
                        color: '#0f172a',
                        outline: 'none',
                        boxSizing: 'border-box',
                        cursor: 'pointer',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23475569'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 16px center',
                        backgroundSize: '18px',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'var(--lp-brand)'; e.target.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.2)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                    >
                      <option value="General" style={{ color: '#0f172a', background: '#ffffff' }}>General Query</option>
                      <option value="Sales & Pricing" style={{ color: '#0f172a', background: '#ffffff' }}>Sales & Pricing</option>
                      <option value="Technical Support" style={{ color: '#0f172a', background: '#ffffff' }}>Technical Support</option>
                      <option value="Partnership / Enterprise" style={{ color: '#0f172a', background: '#ffffff' }}>Partnership / Enterprise</option>
                      {!loading && products && products.length > 0 && (
                        <optgroup label="Products" style={{ color: '#475569', background: '#ffffff', fontWeight: '600' }}>
                          {products.map(p => (
                            <option
                              key={p._id || p.id || p.slug || p.name}
                              value={`Product: ${p.name}`}
                              style={{ color: '#0f172a', background: '#ffffff', fontWeight: 'normal' }}
                            >
                              {p.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="message" className="lp-contact-label" style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#f8fafc', fontSize: '14px' }}>How can we help?</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    placeholder="How can we help you? Describe your question or requirement..."
                    value={formData.message}
                    onChange={handleChange}
                    className="lp-contact-textarea"
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#ffffff', fontSize: '15px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', resize: 'vertical', minHeight: '120px', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onFocus={(e) => { e.target.style.borderColor = 'var(--lp-brand)'; e.target.style.boxShadow = '0 0 0 3px rgba(234, 88, 12, 0.2)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={status === 'sending'}
                  className="lp-btn lp-btn-primary lp-btn-lg" 
                  style={{ width: '100%', marginTop: '8px', justifyContent: 'center' }}
                >
                  {status === 'sending' ? 'Sending...' : status === 'sent' ? 'Message Sent!' : 'Send Message'}
                  {status !== 'sending' && status !== 'sent' && <span className="material-symbols-outlined">send</span>}
                  {status === 'sent' && <span className="material-symbols-outlined">check_circle</span>}
                </button>
              </form>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <Reveal delay={100}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--lp-brand-soft)', color: 'var(--lp-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined">call</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--lp-ink)' }}>Give us a call</h3>
                    <p style={{ color: 'var(--lp-ink-2)', marginBottom: '12px', lineHeight: '1.5' }}>
                      Speak directly with our onboarding specialists or technical support team.
                    </p>
                    <a href="tel:+919711888951" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '600', color: 'var(--lp-brand)', transition: 'opacity 0.2s' }}>
                      +91 9711888951
                    </a>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={200}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(139, 124, 246, 0.15)', color: '#8b7cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--lp-ink)' }}>Email us</h3>
                    <p style={{ color: 'var(--lp-ink-2)', marginBottom: '12px', lineHeight: '1.5' }}>
                      Prefer writing? Drop us an email and we'll reply within 24 hours.
                    </p>
                    <a href="mailto:sales@techhansa.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', color: '#8b7cf6', transition: 'opacity 0.2s' }}>
                      sales@techhansa.com
                    </a>
                  </div>
                </div>
              </Reveal>
              
              <Reveal delay={300}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(242, 169, 59, 0.15)', color: '#f2a93b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined">location_on</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px', color: 'var(--lp-ink)' }}>Visit us</h3>
                    <p style={{ color: 'var(--lp-ink-2)', lineHeight: '1.5' }}>
                      A3-401, The Plaza at 106<br />
                      Sector 106, Gurgaon, Haryana 122006
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
            
          </div>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}


