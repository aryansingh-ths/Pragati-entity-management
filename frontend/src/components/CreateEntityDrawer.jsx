import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CreateEntityDrawer({ onClose, onSuccess }) {
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    apiFetch('/api/super/products')
      .then(res => res.json())
      .then(setProducts)
      .catch(console.error);
  }, []);

  const [form, setForm] = useState({
    name: '',
    owner_name: '',
    slug: '',
    subscribed_products: [],
    contact_email: '',
    contact_phone: '',
    address: '',
    status: 'active',
  });
  const [slugManual, setSlugManual] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  function handleNameChange(e) {
    const name = e.target.value;
    setForm(f => ({ ...f, name, ...(!slugManual && { slug: slugify(name) }) }));
    if (errors.name) setErrors(f => ({ ...f, name: null }));
  }

  function handleSlugChange(e) {
    const slug = slugify(e.target.value) || e.target.value.toLowerCase();
    setForm(f => ({ ...f, slug }));
    setSlugManual(true);
    if (errors.slug) setErrors(f => ({ ...f, slug: null }));
  }

  function toggleProduct(p) {
    setForm(f => ({
      ...f,
      subscribed_products: f.subscribed_products.includes(p)
        ? f.subscribed_products.filter(x => x !== p)
        : [...f.subscribed_products, p],
    }));
    if (errors.subscribed_products) setErrors(f => ({ ...f, subscribed_products: null }));
  }

  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Organisation name is required';
    if (!form.slug.trim()) errs.slug = 'URL slug is required';
    else if (!/^[a-z0-9-]+$/.test(form.slug)) errs.slug = 'Slug must be lowercase letters, numbers, and hyphens only';
    if (!form.subscribed_products.length) errs.subscribed_products = 'Select at least one product';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/super/entities', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors({ slug: data.error || 'Something went wrong' });
        return;
      }
      onSuccess(data);
    } catch (err) {
      setErrors({ slug: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  const hasRms  = form.subscribed_products.includes('rms');
  const hasHrms = form.subscribed_products.includes('hrms');
  const hasHms  = form.subscribed_products.includes('hms');

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal hide-scrollbar" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>New Entity</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>
              Provision a new customer organisation
            </div>
          </div>
          <button className="btn btn-icon btn-ghost" onClick={onClose} style={{ alignSelf: 'flex-start', marginTop: -4 }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {/* Organisation Name */}
          <div className="form-group">
            <label className="form-label">Organisation Name <span className="required">*</span></label>
            <input
              className={`form-input ${errors.name ? 'error' : ''}`}
              type="text"
              placeholder="e.g. Pizza Palace Pvt Ltd"
              value={form.name}
              onChange={handleNameChange}
            />
            {errors.name && (
              <div className="form-error">
                <span className="material-symbols-outlined">error</span>{errors.name}
              </div>
            )}
          </div>

          {/* Owner Name */}
          <div className="form-group">
            <label className="form-label">Owner Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. John Doe"
              value={form.owner_name}
              onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
            />
          </div>

          {/* URL Slug */}
          <div className="form-group">
            <label className="form-label">URL Slug <span className="required">*</span></label>
            <input
              className={`form-input form-input-mono ${errors.slug ? 'error' : ''}`}
              type="text"
              placeholder="e.g. pizza-palace"
              value={form.slug}
              onChange={handleSlugChange}
            />
            {errors.slug && (
              <div className="form-error">
                <span className="material-symbols-outlined">error</span>{errors.slug}
              </div>
            )}

          </div>

          {/* Products */}
          <div className="form-group">
            <label className="form-label">Subscribed Products <span className="required">*</span></label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {!form.subscribed_products.length && (
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>No products selected</span>
              )}
              {products.length === 0 ? (
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>No products available. Add products first.</span>
              ) : (
                products.map(p => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => toggleProduct(p.slug)}
                    className={`chip chip-${p.slug} ${form.subscribed_products.includes(p.slug) ? 'selected' : ''}`}
                  >
                    {p.name}
                    {form.subscribed_products.includes(p.slug) && (
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                    )}
                  </button>
                ))
              )}
            </div>
            {errors.subscribed_products && (
              <div className="form-error">
                <span className="material-symbols-outlined">error</span>{errors.subscribed_products}
              </div>
            )}
          </div>

          {/* Contact Email */}
          <div className="form-group">
            <label className="form-label">Contact Email</label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@example.com"
              value={form.contact_email}
              onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
            />
          </div>

          {/* Contact Phone */}
          <div className="form-group">
            <label className="form-label">Contact Phone</label>
            <input
              className="form-input"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.contact_phone}
              onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
            />
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label">Address</label>
            <textarea
              className="form-input"
              placeholder="123 Main Street, City, State"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              rows={2}
            />
          </div>

          {/* Status */}
          <div className="form-group">
            <label className="form-label">Initial Status</label>
            <div className="radio-group">
              {['active', 'trial'].map(s => (
                <label
                  key={s}
                  className={`radio-option ${form.status === s ? 'selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={form.status === s}
                    onChange={() => setForm(f => ({ ...f, status: s }))}
                  />
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {s === 'active' ? 'check_circle' : 'science'}
                  </span>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: 24, padding: 0 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={submitting || form.subscribed_products.length === 0}
            >
              {submitting ? 'Creating...' : 'Create Entity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
