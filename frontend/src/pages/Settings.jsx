import React, { useState, useEffect } from 'react';
import AppShell from '../components/AppShell.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { apiFetch } from '../api/client.js';

export default function Settings() {
  const { auth } = useAuth();
  const [config, setConfig] = useState({ taxes: [{ name: 'GST', rate: 18 }], yearly_months_charged: 10, upi_id: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await apiFetch('/api/super/config');
      if (res.ok) {
        const data = await res.json();
        if (data.taxes) setConfig(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    
    try {
      const res = await apiFetch('/api/super/config', {
        method: 'PUT',
        body: JSON.stringify({
          taxes: config.taxes,
          yearly_months_charged: parseInt(config.yearly_months_charged, 10),
            upi_id: config.upi_id
        })
      });
      if (res.ok) {
        setMessage('Settings saved successfully!');
      } else {
        setError('Failed to save settings.');
      }
    } catch (err) {
      setError('Network error while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const addTax = () => {
    setConfig(prev => ({ ...prev, taxes: [...prev.taxes, { name: '', rate: 0 }] }));
  };

  const removeTax = (index) => {
    setConfig(prev => {
      const newTaxes = [...prev.taxes];
      newTaxes.splice(index, 1);
      return { ...prev, taxes: newTaxes };
    });
  };

  const updateTax = (index, field, value) => {
    setConfig(prev => {
      const newTaxes = [...prev.taxes];
      newTaxes[index] = { ...newTaxes[index], [field]: value };
      return { ...prev, taxes: newTaxes };
    });
  };

  return (
    <AppShell breadcrumbs={[{ label: 'Entities', to: '/entities' }, { label: 'Settings' }]}>
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Global Configuration</h1>
          <p style={{ color: 'var(--text-2)', marginTop: '4px' }}>Manage tax rates and billing rules for all customers.</p>
        </div>
      </div>

      <div className="card-glass" style={{ padding: 24, marginBottom: 24, maxWidth: 800 }}>
        {loading ? (
          <div className="page-loading"><span className="spinner spinner-dark" /></div>
        ) : (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {message && <div style={{ padding: '12px 16px', background: 'rgba(52, 185, 138, 0.1)', color: '#34b98a', borderRadius: '8px', border: '1px solid rgba(52, 185, 138, 0.2)' }}>{message}</div>}
            {error && <div className="login-error">{error}</div>}

            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Taxes</h2>
              {config.taxes.map((tax, i) => (
                <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 12, alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                    <label className="form-label">Tax Name (e.g. GST)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={tax.name}
                      onChange={e => updateTax(i, 'name', e.target.value)}
                      placeholder="GST"
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="form-input"
                      value={tax.rate}
                      onChange={e => updateTax(i, 'rate', e.target.value)}
                      placeholder="18"
                      required
                    />
                  </div>
                  <button type="button" onClick={() => removeTax(i)} className="btn btn-icon btn-ghost" style={{ color: 'var(--danger)', marginBottom: '4px' }} title="Remove tax">
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              ))}
              
              <button type="button" onClick={addTax} className="btn btn-secondary" style={{ marginTop: 8 }}>
                <span className="material-symbols-outlined">add</span> Add Tax
              </button>
            </div>

            <div className="form-group">
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Yearly Plan Configuration</h2>
              <label className="form-label">Yearly Plan Duration (Months Charged)</label>
              <input
                type="number"
                step="1"
                min="1"
                max="12"
                className="form-input"
                value={config.yearly_months_charged}
                onChange={e => setConfig({ ...config, yearly_months_charged: e.target.value })}
                style={{ maxWidth: 200 }}
                required
              />
              <small style={{ color: 'var(--text-3)', display: 'block', marginTop: 8 }}>
                How many months the customer pays for in a yearly plan (e.g., 10 means 2 months free).
              </small>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}

