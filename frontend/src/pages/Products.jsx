import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import AppShell from '../components/AppShell';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [adding, setAdding] = useState(false);
  const [tagline, setTagline] = useState('');
  const [icon, setIcon] = useState('apps');
  const [image, setImage] = useState('');
  const [features, setFeatures] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await apiFetch('/api/super/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setAdding(true);

    const finalSlug = slug.trim() || name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    try {
      if (editingId) {
        const res = await apiFetch(`/api/super/products/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify({ name, webhook_url: webhookUrl, description, price: Number(price), tagline, icon, image, features })
        });
        if (res.ok) {
          const p = await res.json();
          setProducts(products.map(prod => prod._id === editingId ? p : prod));
          closeForm();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Failed to update product');
        }
      } else {
        const res = await apiFetch('/api/super/products', {
          method: 'POST',
          body: JSON.stringify({ name, slug: finalSlug, webhook_url: webhookUrl, description, price: Number(price), tagline, icon, image, features })
        });
        if (res.ok) {
          const p = await res.json();
          setProducts([p, ...products]);
          closeForm();
        } else {
          const errData = await res.json();
          setError(errData.error || 'Failed to add product');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to save product');
    } finally {
      setAdding(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName('');
    setSlug('');
    setWebhookUrl('');
    setDescription('');
    setPrice(0);
    setTagline('');
    setIcon('apps');
    setImage('');
    setFeatures('');
    setError(null);
  };

  const handleImageFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('Image must be under 8 MB'); return; }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 900;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImage(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => setError('Could not read that image');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const openAdd = () => {
    closeForm();
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditingId(p._id);
    setName(p.name);
    setSlug(p.slug);
    setWebhookUrl(p.webhook_url || '');
    setDescription(p.description || '');
    setPrice(p.price || 0);
    setTagline(p.tagline || '');
    setIcon(p.icon || 'apps');
    setImage(p.image || '');
    setFeatures((p.features || []).join('\n'));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiFetch(`/api/super/products/${id}`, { method: 'DELETE' });
      setProducts(products.filter(p => p._id !== id));
    } catch (err) {
      alert('Failed to delete product');
    }
  };



  return (
    <AppShell breadcrumbs={[{ label: 'Entities', to: '/entities' }, { label: 'Products' }]}>
          <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>Global Products</h1>
            </div>
            <button className="btn btn-primary" onClick={openAdd}>
              <span className="material-symbols-outlined">add</span>
              Add Product
            </button>
          </div>

          {showForm && (
            <div className="card-glass" style={{ padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                {editingId ? 'Edit Product' : 'Add New Product'}
              </h2>
              {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Product Name</label>
                    <input type="text" className="form-input" required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pragati POS" />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Slug</label>
                    <input type="text" className="form-input" value={slug} onChange={e => setSlug(e.target.value)} placeholder="e.g. rms" disabled={!!editingId} />
                  </div>
                  <div className="form-group" style={{ width: 150 }}>
                    <label className="form-label">Monthly Price (₹)</label>
                    <input type="number" min="0" className="form-input" required value={price} onChange={e => setPrice(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Webhook URL</label>
                  <input type="url" className="form-input form-input-mono" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://api.yourproduct.com/webhook" />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input type="text" className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the product" />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Landing Page Tagline</label>
                    <input type="text" className="form-input" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Run your restaurant, effortlessly" maxLength={80} />
                  </div>
                  <div className="form-group" style={{ width: 220 }}>
                    <label className="form-label">Icon (Material Symbol)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 26, color: 'var(--accent)' }}>{icon || 'apps'}</span>
                      <input type="text" className="form-input form-input-mono" value={icon} onChange={e => setIcon(e.target.value.trim())} placeholder="restaurant" />
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Product Image (optional — shown on landing page card)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {image && <img src={image} alt="Preview" style={{ width: 96, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />}
                    <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                      <span className="material-symbols-outlined">upload</span>
                      {image ? 'Change image' : 'Upload image'}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: 'none' }} onChange={handleImageFile} />
                    </label>
                    {image && (
                      <button type="button" className="btn btn-ghost" onClick={() => setImage('')}>
                        <span className="material-symbols-outlined">delete</span>Remove
                      </button>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Key Features (one per line, max 8)</label>
                  <textarea className="form-input" rows={4} value={features} onChange={e => setFeatures(e.target.value)} placeholder={'Table & order management\nKitchen display system\nGST-ready billing'} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                  <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={adding}>
                    {adding ? 'Saving...' : 'Save Product'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="table-container card-glass">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Slug</th>
                  <th>Webhook URL</th>
                  <th>Monthly Price</th>
                  <th>Description</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5}><div className="page-loading"><span className="spinner spinner-dark" /></div></td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={5}><div className="empty-state" style={{ padding: 32 }}>No products defined yet.</div></td></tr>
                ) : (
                  products.map(p => (
                    <tr key={p._id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-2)' }}>{p.slug}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text-3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.webhook_url}>{p.webhook_url || '-'}</td>
                      <td style={{ fontWeight: 600 }}>₹{p.price || 0}</td>
                      <td style={{ color: 'var(--text-2)' }}>{p.description || '-'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-icon btn-ghost" style={{ color: 'var(--primary)', marginRight: 8 }} onClick={() => openEdit(p)} title="Edit Product">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button className="btn btn-icon btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p._id)} title="Delete Product">
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
    </AppShell>
  );
}
