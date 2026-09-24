import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function SuccessCredentialsModal({ data, onClose }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const { tenant, provisioned_credentials } = data;

  function handleCopy() {
    const text = [
      `Entity: ${tenant.name}`,
      `Entity ID: ${tenant.entity_id}`,
      `Username: ${provisioned_credentials.username}`,
      `Password: ${provisioned_credentials.password}`,
    ].join('\n');
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="cred-modal-icon">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div className="cred-modal-title">Entity Created!</div>
          <div className="cred-modal-sub">
            <strong>{tenant.name}</strong> has been provisioned successfully.
          </div>

          <div className="cred-box">
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Provisioned Admin Credentials
            </div>
            {[
              { key: 'Entity Name', value: tenant.name },
              { key: 'Entity ID', value: tenant.entity_id },
              { key: 'Username', value: provisioned_credentials.username },
              { key: 'Password', value: provisioned_credentials.password },
            ].map(row => (
              <div className="cred-row" key={row.key}>
                <div className="cred-key">{row.key}</div>
                <div className="cred-value" style={{ flex: 1 }}>{row.value}</div>
                <button
                  className="copy-btn-inline"
                  onClick={() => copyToClipboard(row.value)}
                  title="Copy"
                >
                  <span className="material-symbols-outlined">content_copy</span>
                </button>
              </div>
            ))}
          </div>

          <div style={{
            padding: '10px 14px',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 10,
            fontSize: 12,
            color: '#fbbf24',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>warning</span>
            Save these credentials now. The password will not be shown again. Ask the customer to change it on first login.
          </div>
        </div>

        <div className="modal-footer" style={{ paddingTop: 20 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={handleCopy}>
            <span className="material-symbols-outlined">{copied ? 'check' : 'content_copy'}</span>
            {copied ? 'Copied!' : 'Copy All'}
          </button>
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={() => navigate(`/entities/${tenant._id}`)}
          >
            <span className="material-symbols-outlined">open_in_new</span>
            View Entity
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
