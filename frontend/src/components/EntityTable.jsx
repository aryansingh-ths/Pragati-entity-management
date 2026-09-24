import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductBadgeList } from './ProductBadge.jsx';
import StatusBadge from './StatusBadge.jsx';
import SkeletonRow from './SkeletonRow.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import { apiFetch } from '../api/client.js';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function EntityTable({ entities, loading, onRefresh }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteSlugInput, setDeleteSlugInput] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [globalProducts, setGlobalProducts] = useState([]);

  useEffect(() => {
    apiFetch('/api/super/products')
      .then(res => res.json())
      .then(setGlobalProducts)
      .catch(console.error);
  }, []);

  // Client-side filter
  const filtered = entities.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.name?.toLowerCase().includes(q) || e.slug?.toLowerCase().includes(q);
    const matchProduct = productFilter === 'all' || (e.subscribed_products || []).includes(productFilter);
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchProduct && matchStatus;
  });

  async function handleToggleStatus(entity) {
    const action = entity.status === 'suspended' ? 'activate' : 'suspend';
    setActionLoading(prev => ({ ...prev, [entity._id]: true }));
    try {
      const res = await apiFetch(`/api/super/entities/${entity._id}/${action}`, { method: 'PUT' });
      if (res.ok) onRefresh();
    } finally {
      setActionLoading(prev => ({ ...prev, [entity._id]: false }));
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete._id);
    try {
      const res = await apiFetch(`/api/super/entities/${confirmDelete._id}`, { method: 'DELETE' });
      if (res.ok) {
        setConfirmDelete(null);
        setDeleteSlugInput('');
        onRefresh();
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="table-toolbar">
        <div className="search-input-wrap">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder="Search by name or slug…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="filter-select" value={productFilter} onChange={e => setProductFilter(e.target.value)}>
          <option value="all">All Products</option>
          {globalProducts.map(p => (
            <option key={p.slug} value={p.slug}>{p.name}</option>
          ))}
        </select>
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="trial">Trial</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th className="row-number">#</th>
              <th>Entity Name</th>
              <th>Slug</th>
              <th>Products</th>
              <th>Status</th>
              <th>Users</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <span className="material-symbols-outlined empty-state-icon">corporate_fare</span>
                    <h3>No entities found</h3>
                    <p>
                      {entities.length === 0
                        ? 'No entities yet. Create your first one using the "+ New Entity" button.'
                        : 'No entities match your current filters.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((entity, idx) => (
                <tr key={entity._id}>
                  <td className="row-number">{idx + 1}</td>
                  <td>
                    <div className="entity-name-cell">
                      {entity.name}
                      {entity.contact_email && (
                        <div className="entity-sub">{entity.contact_email}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="mono-chip">{entity.slug}</span>
                  </td>
                  <td>
                    <ProductBadgeList products={entity.subscribed_products} />
                  </td>
                  <td>
                    <StatusBadge status={entity.status} />
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
                    {entity.user_count ?? 0}
                  </td>
                  <td style={{ color: 'var(--text-2)', fontSize: 13 }}>
                    {formatDate(entity.createdAt)}
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`/entities/${entity._id}`)}
                        title="View entity"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>open_in_new</span>
                        View
                      </button>
                      <button
                        className={`btn btn-sm ${entity.status === 'suspended' ? 'btn-success' : 'btn-warning'}`}
                        onClick={() => handleToggleStatus(entity)}
                        disabled={actionLoading[entity._id]}
                        title={entity.status === 'suspended' ? 'Activate' : 'Suspend'}
                      >
                        {actionLoading[entity._id] ? (
                          <span className="spinner spinner-sm" />
                        ) : (
                          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                            {entity.status === 'suspended' ? 'play_circle' : 'pause_circle'}
                          </span>
                        )}
                        {entity.status === 'suspended' ? 'Activate' : 'Suspend'}
                      </button>
                      <button
                        className="btn btn-danger btn-sm btn-icon"
                        onClick={() => { setConfirmDelete(entity); setDeleteSlugInput(''); }}
                        title="Delete entity"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 15 }}>delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirm Dialog */}
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete "${confirmDelete.name}"?`}
          message="This will permanently delete all associated data including users, orders, menus, and all other records. This action cannot be undone."
          confirmLabel={deletingId ? 'Deleting…' : 'Delete Entity'}
          danger
          onConfirm={() => deleteSlugInput === confirmDelete.slug && handleDelete()}
          onCancel={() => { setConfirmDelete(null); setDeleteSlugInput(''); }}
        >
          <div className="form-group">
            <label className="form-label">
              Type <code style={{ background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 12 }}>{confirmDelete.slug}</code> to confirm:
            </label>
            <input
              className="form-input form-input-mono"
              type="text"
              placeholder={confirmDelete.slug}
              value={deleteSlugInput}
              onChange={e => setDeleteSlugInput(e.target.value)}
              autoFocus
            />
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}
