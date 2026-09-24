import React from 'react';

export default function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal">
        <div className="modal-header">
          <div className="confirm-icon">
            <span className="material-symbols-outlined">
              {danger ? 'warning' : 'help'}
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</div>
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: children ? 0 : 8 }}>
            {message}
          </p>
        </div>
        {children && (
          <div className="modal-body" style={{ paddingTop: 16 }}>
            {children}
          </div>
        )}
        <div className="modal-footer" style={{ paddingTop: 8 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            style={{ flex: 1 }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
