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
            
            <div style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(16px)', border: '1px solid var(--lp-line)', borderRadius: '24px', padding: '40px', boxShadow: 'var(--lp-shadow)' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label htmlFor="name" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--lp-ink)' }}>Name</label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--lp-line)', background: '#fff', fontSize: '15px', color: 'var(--lp-ink)', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--lp-brand)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--lp-line)'}
                  />
                </div>
                <div>
                  <label htmlFor="email" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--lp-ink)' }}>Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--lp-line)', background: '#fff', fontSize: '15px', color: 'var(--lp-ink)', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--lp-brand)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--lp-line)'}
                  />
                </div>
                <div>
                  <label htmlFor="category" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--lp-ink)' }}>Category</label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--lp-line)', background: '#fff', fontSize: '15px', color: 'var(--lp-ink)', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', appearance: 'none' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--lp-brand)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--lp-line)'}
                  >
                    <option value="General">General Query</option>
                    {!loading && products && products.map(p => (
                      <option key={p.id} value={`Product: ${p.name}`}>Product: {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="message" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--lp-ink)' }}>How can we help?</label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--lp-line)', background: '#fff', fontSize: '15px', color: 'var(--lp-ink)', outline: 'none', resize: 'vertical', minHeight: '100px', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--lp-brand)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--lp-line)'}
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
                    <a href="tel:+919876543210" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '600', color: 'var(--lp-brand)', transition: 'opacity 0.2s' }}>
                      +91 98765 43210
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
                    <a href="mailto:support@techhansa.com" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '600', color: '#8b7cf6', transition: 'opacity 0.2s' }}>
                      support@techhansa.com
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
                      Techhansa HQ<br />
                      123 Innovation Drive, Sector 4<br />
                      Bengaluru, Karnataka 560100
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
