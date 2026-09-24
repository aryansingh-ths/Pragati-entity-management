import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';
import StatCard from '../components/StatCard.jsx';
import { apiFetch } from '../api/client.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { ProductBadgeList } from '../components/ProductBadge.jsx';

const PRODUCT_COLORS = { rms: '#6366f1', hms: '#14b8a6', hrms: '#f59e0b' };
const STATUS_COLORS  = { active: '#22c55e', suspended: '#ef4444', trial: '#f59e0b' };

function ProgressBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="progress-bar-row">
      <div className="progress-bar-label">{label}</div>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <div className="progress-bar-count">{value}</div>
    </div>
  );
}

function BarChart({ data, colors, label }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Object.entries(data).map(([key, val]) => (
        <div key={key}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', color: colors[key] || 'var(--text-2)', letterSpacing: '0.04em' }}>{key}</span>
            <span style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--text-1)' }}>{val}</span>
          </div>
          <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${(val / max) * 100}%`,
              background: colors[key] || 'var(--accent)',
              borderRadius: 999,
              transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Stats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState('user_count');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [statsRes, entitiesRes] = await Promise.all([
          apiFetch('/api/super/stats'),
          apiFetch('/api/super/entities'),
        ]);
        if (statsRes.ok)    setStats(await statsRes.json());
        if (entitiesRes.ok) setEntities(await entitiesRes.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }

  const sorted = [...entities].sort((a, b) => {
    const va = a[sortField] ?? 0;
    const vb = b[sortField] ?? 0;
    return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  const totalEntities = stats?.total_entities || 0;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar breadcrumbs={[{ label: 'Entities', to: '/entities' }, { label: 'Global Stats' }]} />
        <div className="page-container fade-in">
          <div className="dashboard-header">
            <h1>Global Statistics</h1>
            <p>Aggregate metrics across all Pragati entities and products.</p>
          </div>

          {/* Top Stat Cards */}
          <div className="stats-grid">
            <StatCard label="Total Entities"   value={stats?.total_entities}          icon="corporate_fare" color="var(--accent)" />
            <StatCard label="Active Entities"  value={stats?.by_status?.active}       icon="check_circle"   color="var(--success)" />
            <StatCard label="Suspended"        value={stats?.by_status?.suspended}    icon="pause_circle"   color="var(--danger)" />
            <StatCard label="Trial"            value={stats?.by_status?.trial}        icon="science"        color="var(--warning)" />
            <StatCard label="Total Users"      value={stats?.total_users}             icon="group"          color="#a78bfa" />
          </div>

          {/* Two-column breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
            {/* Status Breakdown */}
            <div className="section-card">
              <div className="section-heading">By Status</div>
              <div className="section-sub">Distribution of entity statuses</div>
              {stats && (
                <div className="progress-bar-wrap">
                  <ProgressBar label="Active"    value={stats.by_status?.active    ?? 0} total={totalEntities} color="var(--success)" />
                  <ProgressBar label="Suspended" value={stats.by_status?.suspended ?? 0} total={totalEntities} color="var(--danger)" />
                  <ProgressBar label="Trial"     value={stats.by_status?.trial     ?? 0} total={totalEntities} color="var(--warning)" />
                </div>
              )}
            </div>

            {/* Product Breakdown */}
            <div className="section-card">
              <div className="section-heading">By Product</div>
              <div className="section-sub">Entities subscribed to each product</div>
              {stats && (
                <BarChart data={stats.by_product} colors={PRODUCT_COLORS} />
              )}
            </div>
          </div>

          {/* Newest Entity */}
          {stats?.newest_entity && (
            <div className="section-card" style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--accent)', fontSize: 22 }}>new_releases</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>Newest Entity</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.newest_entity.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {new Date(stats.newest_entity.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ProductBadgeList products={stats.newest_entity.subscribed_products} />
                <StatusBadge status={stats.newest_entity.status} />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/entities/${stats.newest_entity._id}`)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                  View
                </button>
              </div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="section-heading" style={{ marginBottom: 4 }}>Entity Leaderboard</div>
          <div className="section-sub">Sorted by user count — click column headers to sort</div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                    Entity {sortField === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th>Products</th>
                  <th>Status</th>
                  <th onClick={() => handleSort('user_count')} style={{ cursor: 'pointer' }}>
                    Users {sortField === 'user_count' ? (sortDir === 'asc' ? '↑' : '↓') : '↓'}
                  </th>
                  <th onClick={() => handleSort('order_count')} style={{ cursor: 'pointer' }}>
                    Orders {sortField === 'order_count' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7}>
                    <div className="page-loading"><span className="spinner spinner-dark" /></div>
                  </td></tr>
                ) : sorted.length === 0 ? (
                  <tr><td colSpan={7}>
                    <div className="empty-state" style={{ padding: 40 }}>
                      <span className="material-symbols-outlined empty-state-icon">bar_chart</span>
                      <h3>No data yet</h3>
                    </div>
                  </td></tr>
                ) : (
                  sorted.map((e, i) => (
                    <tr key={e._id}>
                      <td>
                        <span className={`leaderboard-rank ${i < 3 ? `rank-${i+1}` : ''}`}>
                          {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{e.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{e.slug}</div>
                      </td>
                      <td><ProductBadgeList products={e.subscribed_products} /></td>
                      <td><StatusBadge status={e.status} /></td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{e.user_count ?? 0}</td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>{e.order_count ?? 0}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/entities/${e._id}`)}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                          View
                        </button>
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
