import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client.js';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

export default function Billing() {
  const [billingData, setBillingData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBilling();
  }, []);

  const fetchBilling = async () => {
    try {
      const res = await apiFetch('/api/super/billing');
      if (res.ok) {
        const data = await res.json();
        setBillingData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalMRR = billingData.reduce((acc, curr) => acc + curr.mrr, 0);

  return (
    <div className="layout">
      <Sidebar />
      <div className="main-content">
        <Topbar breadcrumbs={[{ label: 'Entities', to: '/entities' }, { label: 'Billing' }]} />
        
        <div className="page-container">
          <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1>Entity Billing & Finance</h1>
              <p>Financial records and MRR for each entity.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>Total MRR</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>₹{totalMRR.toLocaleString()}</div>
            </div>
          </div>

          <div className="table-container card-glass">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Status</th>
                  <th>Products Subscribed</th>
                  <th style={{ textAlign: 'right' }}>Estimated MRR</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4}><div className="page-loading"><span className="spinner spinner-dark" /></div></td></tr>
                ) : billingData.length === 0 ? (
                  <tr><td colSpan={4}><div className="empty-state" style={{ padding: 32 }}>No entities found.</div></td></tr>
                ) : (
                  billingData.map(b => (
                    <tr key={b._id}>
                      <td style={{ fontWeight: 600 }}>{b.name}</td>
                      <td>
                        <span className={`status-badge status-${b.status}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {b.subscribed_products.length > 0 ? (
                            b.subscribed_products.map(p => (
                              <span key={p} className="product-chip product-chip-rms">{p.toUpperCase()}</span>
                            ))
                          ) : (
                            <span style={{ color: 'var(--text-3)', fontSize: 13 }}>None</span>
                          )}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-1)' }}>
                        ₹{b.mrr.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
