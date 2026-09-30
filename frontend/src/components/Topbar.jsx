import React from 'react';
import { Link } from 'react-router-dom';

export default function Topbar({ title, breadcrumbs = [], onMenuToggle }) {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Hamburger menu button — visible only on mobile */}
        <button className="topbar-hamburger" onClick={onMenuToggle} aria-label="Toggle menu">
          <span className="material-symbols-outlined">menu</span>
        </button>

        {breadcrumbs.length > 0 ? (
          <div className="topbar-breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="sep">/</span>}
                {crumb.to ? (
                  <Link to={crumb.to}>{crumb.label}</Link>
                ) : (
                  <span style={{ color: 'var(--text-1)', fontWeight: 500 }}>{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
        ) : (
          <div className="topbar-title">{title}</div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          fontSize: 12,
          color: 'var(--text-3)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span
            style={{
              width: 7, height: 7,
              borderRadius: '50%',
              background: 'var(--success)',
              display: 'inline-block',
              boxShadow: '0 0 8px var(--success)'
            }}
          />
          System Online
        </div>
      </div>
    </header>
  );
}
