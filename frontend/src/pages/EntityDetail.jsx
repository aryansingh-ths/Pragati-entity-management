import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { ProductBadgeList } from '../components/ProductBadge.jsx';
import { apiFetch } from '../api/client.js';

const DEFAULT_COLORS = ['#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6'];
const FALLBACK_ICONS = ['inventory_2', 'extension', 'apps', 'web', 'widgets'];

function getProductConfig(globalProducts, pSlug) {
  const gp = globalProducts.find(x => x.slug === pSlug);
  if (gp) {
    // Generate deterministic index for color/icon based on slug length
    const idx = pSlug.length % DEFAULT_COLORS.length;
    return {
      code: pSlug,
      label: gp.name,
      desc: gp.description,
      icon: FALLBACK_ICONS[idx],
      color: DEFAULT_COLORS[idx]
    };
  }
  return { code: pSlug, label: pSlug, desc: '', icon: 'extension', color: '#6366f1' };
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy-btn"
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      title="Copy"
    >
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
        {copied ? 'check' : 'content_copy'}
      </span>
    </button>
  );
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────
function OverviewTab({ entity, onSaved }) {
  const [form, setForm] = useState({ ...entity });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/super/entities/${entity._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          owner_name: form.owner_name,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone,
          address: form.address,
          status: form.status,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        onSaved(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="detail-grid">
        <div className="detail-field">
          <label>Organisation Name</label>
          <input
            className="form-input"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="detail-field">
          <label>URL Slug</label>
          <div className="form-input" style={{ background: 'var(--surface-3)', color: 'var(--text-3)', fontFamily: 'var(--mono)', fontSize: 13 }}>
            {entity.slug}
            <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6 }}>(immutable)</span>
          </div>
        </div>
        <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
          <label>Owner Name</label>
          <input
            className="form-input"
            value={form.owner_name || ''}
            onChange={e => setForm(f => ({ ...f, owner_name: e.target.value }))}
            placeholder="e.g. John Doe"
          />
        </div>
        <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
          <label>Entity ID</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="mono-chip" style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}>
              {entity.entity_id}
            </div>
            <CopyBtn value={entity.entity_id} />
          </div>
        </div>
        <div className="detail-field">
          <label>Contact Email</label>
          <input
            className="form-input"
            type="email"
            value={form.contact_email}
            onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
          />
        </div>
        <div className="detail-field">
          <label>Contact Phone</label>
          <input
            className="form-input"
            type="tel"
            value={form.contact_phone}
            onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
          />
        </div>
        <div className="detail-field" style={{ gridColumn: '1 / -1' }}>
          <label>Address</label>
          <textarea
            className="form-input"
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            rows={2}
          />
        </div>
        <div className="detail-field">
          <label>Status</label>
          <select
            className="form-input form-select"
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
          >
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <div className="detail-field">
          <label>Created At</label>
          <div className="form-input" style={{ background: 'var(--surface-3)', color: 'var(--text-3)', fontSize: 13 }}>
            {formatDate(entity.createdAt)}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="spinner" /> Saving…</> : saved ? <><span className="material-symbols-outlined">check</span> Saved!</> : <><span className="material-symbols-outlined">save</span> Save Changes</>}
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Products ─────────────────────────────────────────────────────────────
function ProductsTab({ entity, onSaved }) {
  const [products, setProducts] = useState(entity.subscribed_products || []);
  const [saving, setSaving] = useState(null);
  const [globalProducts, setGlobalProducts] = useState([]);

  useEffect(() => {
    apiFetch('/api/super/products')
      .then(res => res.json())
      .then(setGlobalProducts)
      .catch(console.error);
  }, []);

  async function toggleProduct(code) {
    const updated = products.includes(code)
      ? products.filter(p => p !== code)
      : [...products, code];
    setProducts(updated);
    setSaving(code);
    try {
      const res = await apiFetch(`/api/super/entities/${entity._id}`, {
        method: 'PUT',
        body: JSON.stringify({ subscribed_products: updated }),
      });
      if (res) {
        onSaved(res);
      } else {
        setProducts(products); // revert
      }
    } catch {
      setProducts(products); // revert
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Subscribed Products</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          Toggle which Pragati products this entity has access to. Changes take effect immediately.
        </div>
      </div>
      <div className="product-cards-grid">
        {globalProducts.length === 0 && <div className="page-loading"><span className="spinner spinner-dark" /></div>}
        {globalProducts.map(gp => {
          const p = getProductConfig(globalProducts, gp.slug);
          const subscribed = products.includes(p.code);
          return (
            <div
              key={p.code}
              className="product-card"
              style={subscribed ? { borderColor: p.color + '44', background: p.color + '08' } : {}}
            >
              <div className="product-card-header">
                <div className="product-card-icon" style={{ background: p.color + '20' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: p.color }}>
                    {p.icon}
                  </span>
                </div>
                <label className="toggle-switch" style={{ cursor: saving === p.code ? 'wait' : 'pointer' }}>
                  <input type="checkbox" checked={subscribed} onChange={() => !saving && toggleProduct(p.code)} />
                  <div className={`toggle-track ${subscribed ? 'on' : ''}`} onClick={() => !saving && toggleProduct(p.code)} />
                </label>
              </div>
              <div>
                <div className="product-card-title" style={{ color: subscribed ? p.color : 'var(--text-1)' }}>
                  {p.label}
                </div>
                <div className="product-card-desc">{p.desc}</div>
              </div>
              {subscribed && (
                <a
                  href={`https://pragati.com/${p.code}/${entity.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="product-card-link"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>link</span>
                  pragati.com/{p.code}/{entity.slug}
                  <span className="material-symbols-outlined" style={{ fontSize: 12, marginLeft: 'auto' }}>open_in_new</span>
                </a>
              )}
              {!subscribed && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '6px 10px', background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  Not subscribed
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab: Users ────────────────────────────────────────────────────────────────
function UsersTab({ entity }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'Admin' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/staff', {
        headers: { 'X-Tenant-Slug': entity.slug },
      });
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, [entity.slug]);

  async function handleAddUser(e) {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      setAddError('Username and password are required');
      return;
    }
    setAdding(true);
    setAddError('');
    try {
      const res = await apiFetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'X-Tenant-Slug': entity.slug },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || 'Failed to add user'); return; }
      setShowAddForm(false);
      setNewUser({ username: '', password: '', role: 'Admin' });
      fetchUsers();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Staff Users</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            {users.length} user{users.length !== 1 ? 's' : ''} for this entity
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddForm(s => !s)}>
          <span className="material-symbols-outlined">person_add</span>
          Add User
        </button>
      </div>

      {showAddForm && (
        <div className="add-user-form">
          <div className="form-group">
            <label className="form-label">Username <span className="required">*</span></label>
            <input
              className="form-input form-input-mono"
              placeholder="username"
              value={newUser.username}
              onChange={e => setNewUser(u => ({ ...u, username: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password <span className="required">*</span></label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={newUser.password}
              onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              className="form-input form-select"
              value={newUser.role}
              onChange={e => setNewUser(u => ({ ...u, role: e.target.value }))}
            >
              <option value="Admin">Admin</option>
              <option value="Host">Host</option>
              <option value="Kitchen">Kitchen</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleAddUser} disabled={adding} style={{ height: 42, alignSelf: 'flex-end' }}>
            {adding ? <span className="spinner" /> : <span className="material-symbols-outlined">add</span>}
          </button>
          {addError && (
            <div className="form-error" style={{ gridColumn: '1 / -1' }}>
              <span className="material-symbols-outlined">error</span>{addError}
            </div>
          )}
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}><div className="page-loading"><span className="spinner spinner-dark" /></div></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={4}><div className="empty-state" style={{ padding: 32 }}>
                <span className="material-symbols-outlined empty-state-icon">person_off</span>
                <h3>No users found</h3>
              </div></td></tr>
            ) : (
              users.map((u, i) => (
                <tr key={u._id}>
                  <td className="row-number">{i + 1}</td>
                  <td>
                    <span className="mono-chip">{u.username}</span>
                  </td>
                  <td><span className="role-badge">{u.role}</span></td>
                  <td style={{ color: 'var(--text-2)', fontSize: 13 }}>{formatDate(u.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab: Danger Zone ─────────────────────────────────────────────────────────
function DangerTab({ entity, onSaved }) {
  const navigate = useNavigate();
  const [suspending, setSuspending] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);

  async function handleSuspend() {
    setSuspending(true);
    try {
      const res = await apiFetch(`/api/super/entities/${entity._id}/suspend`, { method: 'PUT' });
      if (res.ok) onSaved(await res.json());
    } finally { setSuspending(false); }
  }

  async function handleActivate() {
    setActivating(true);
    try {
      const res = await apiFetch(`/api/super/entities/${entity._id}/activate`, { method: 'PUT' });
      if (res.ok) onSaved(await res.json());
    } finally { setActivating(false); }
  }

  async function handleDelete() {
    if (deleteInput !== entity.slug) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/super/entities/${entity._id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setDeleteResult(data);
        setTimeout(() => navigate('/entities'), 3000);
      }
    } finally { setDeleting(false); }
  }

  if (deleteResult) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Entity Deleted</div>
        <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 20 }}>
          All data for <strong>{entity.name}</strong> has been permanently deleted.
        </div>
        <div className="cred-box" style={{ textAlign: 'left', maxWidth: 400, margin: '0 auto 20px' }}>
          {Object.entries(deleteResult.deleted_counts).map(([k, v]) => (
            <div className="cred-row" key={k}>
              <div className="cred-key">{k.replace(/_/g, ' ')}</div>
              <div className="cred-value">{v} deleted</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Redirecting to dashboard…</div>
      </div>
    );
  }

  return (
    <div>
      <div className="danger-zone">
        <div className="danger-zone-title">
          <span className="material-symbols-outlined">warning</span>
          Danger Zone
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
          These actions are irreversible. Proceed with extreme caution.
        </div>

        {/* Suspend / Activate */}
        <div className="danger-action">
          <div className="danger-action-info">
            <h4>{entity.status === 'suspended' ? 'Reactivate Entity' : 'Suspend Entity'}</h4>
            <p>
              {entity.status === 'suspended'
                ? 'Restore access — all logins for this entity will succeed again.'
                : 'Suspend access — all logins for this entity will immediately fail with a 403 error.'}
            </p>
          </div>
          {entity.status === 'suspended' ? (
            <button className="btn btn-success" onClick={handleActivate} disabled={activating}>
              {activating ? <span className="spinner" /> : <span className="material-symbols-outlined">play_circle</span>}
              Activate
            </button>
          ) : (
            <button className="btn btn-warning" onClick={handleSuspend} disabled={suspending}>
              {suspending ? <span className="spinner" /> : <span className="material-symbols-outlined">pause_circle</span>}
              Suspend
            </button>
          )}
        </div>

        {/* Delete */}
        <div className="danger-action">
          <div className="danger-action-info">
            <h4>Delete Entity</h4>
            <p>
              Permanently delete this entity and ALL associated data across every collection.
              This cascades through {'>'}18 collections and cannot be undone.
            </p>
            <div className="form-group" style={{ marginTop: 12, maxWidth: 320 }}>
              <label className="form-label" style={{ fontSize: 12 }}>
                Type <code style={{ background: 'var(--surface-3)', padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--mono)' }}>{entity.slug}</code> to confirm:
              </label>
              <input
                className="form-input form-input-mono"
                style={{ fontSize: 13 }}
                placeholder={entity.slug}
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
              />
            </div>
          </div>
          <button
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={deleteInput !== entity.slug || deleting}
            style={{ flexShrink: 0 }}
          >
            {deleting ? <span className="spinner" /> : <span className="material-symbols-outlined">delete_forever</span>}
            Delete Entity
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main EntityDetail Page ───────────────────────────────────────────────────
export default function EntityDetail() {
  const { id } = useParams();
  const [entity, setEntity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [savingName, setSavingName] = useState(false);

  async function fetchEntity() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/super/entities/${id}`);
      if (res.ok) {
        const data = await res.json();
        setEntity(data);
        setDraftName(data.name);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchEntity(); }, [id]);

  async function handleSaveName() {
    setSavingName(true);
    try {
      const res = await apiFetch(`/api/super/entities/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: draftName }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEntity(updated);
        setEditingName(false);
      }
    } finally { setSavingName(false); }
  }

  const TABS = [
    { key: 'overview',  label: 'Overview',  icon: 'info' },
    { key: 'products',  label: 'Products',  icon: 'apps' },
    { key: 'users',     label: 'Users',     icon: 'group' },
    { key: 'danger',    label: 'Danger',    icon: 'warning' },
  ];

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Topbar breadcrumbs={[{ label: 'Entities', to: '/entities' }, { label: '…' }]} />
          <div className="page-container"><div className="page-loading"><span className="spinner spinner-dark" /></div></div>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Topbar breadcrumbs={[{ label: 'Entities', to: '/entities' }, { label: 'Not Found' }]} />
          <div className="page-container">
            <div className="empty-state" style={{ padding: 80 }}>
              <span className="material-symbols-outlined empty-state-icon">search_off</span>
              <h3>Entity not found</h3>
              <p>The entity you're looking for doesn't exist or has been deleted.</p>
              <Link to="/entities" className="btn btn-primary" style={{ marginTop: 8 }}>Back to Entities</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar breadcrumbs={[
          { label: 'Entities', to: '/entities' },
          { label: entity.name },
        ]} />

        <div className="page-container fade-in">
          {/* Header Card */}
          <div className="card entity-header-card">
            <div className="entity-header-left">
              {/* Inline Editable Name */}
              <div className="entity-name-editable">
                {editingName ? (
                  <div className="inline-edit-wrap" style={{ flex: 1 }}>
                    <input
                      className="inline-edit-input"
                      value={draftName}
                      onChange={e => setDraftName(e.target.value)}
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleSaveName} disabled={savingName}>
                      {savingName ? <span className="spinner spinner-sm" /> : 'Save'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingName(false); setDraftName(entity.name); }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>{entity.name}</h1>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => setEditingName(true)}
                      title="Edit name"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
                    </button>
                  </>
                )}
              </div>

              {/* Meta row */}
              <div className="entity-meta">
                <span className="mono-chip">{entity.slug}</span>
                <StatusBadge status={entity.status} />
                <ProductBadgeList products={entity.subscribed_products} />
              </div>

              {/* Entity ID */}
              <div className="entity-id-display" style={{ marginTop: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Entity ID:</span>
                <span className="mono-chip" style={{ fontSize: 11 }}>{entity.entity_id}</span>
                <CopyBtn value={entity.entity_id} />
              </div>
            </div>

            {/* Quick stats */}
            <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
              {[
                { label: 'Users', value: entity.user_count ?? 0, icon: 'group' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', padding: '8px 16px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)', minWidth: 72 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--accent)', display: 'block', marginBottom: 4 }}>{s.icon}</span>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-bar">
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="material-symbols-outlined">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="section-card fade-in" key={activeTab}>
            {activeTab === 'overview' && <OverviewTab entity={entity} onSaved={setEntity} />}
            {activeTab === 'products' && <ProductsTab entity={entity} onSaved={setEntity} />}
            {activeTab === 'users'    && <UsersTab entity={entity} />}
            {activeTab === 'danger'   && <DangerTab entity={entity} onSaved={setEntity} />}
          </div>
        </div>
      </div>
    </div>
  );
}
