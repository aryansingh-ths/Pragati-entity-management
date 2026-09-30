import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { NavLink, Link } from 'react-router-dom';

const NAV_ITEMS = [

  { to: '/entities',  icon: 'corporate_fare', label: 'Entities' },
  { to: '/stats',     icon: 'bar_chart',      label: 'Global Stats' },
  { to: '/products',  icon: 'inventory_2',    label: 'Products' },
  { to: '/billing',   icon: 'receipt_long',   label: 'Billing' },
  { to: '/audits',    icon: 'history',        label: 'Audit Logs' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { auth, logout } = useAuth();
  const initial = auth?.username?.[0]?.toUpperCase() || 'S';
  const location = useLocation();

  // Auto-close sidebar on route change (mobile)
  useEffect(() => {
    if (onClose) onClose();
  }, [location.pathname]);

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img src="/techhansa-logo.png" alt="Techhansa" style={{ height: '72px', objectFit: 'contain' }} />
            <div className="logo-text">Pragati</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Navigation</div>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="sidebar-item-label">{item.label}</span>
            </NavLink>
          ))}


        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">{initial}</div>
            <div>
              <div className="sidebar-username">{auth?.username || 'SuperAdmin'}</div>
              <div className="sidebar-role">Super Administrator</div>
            </div>
          </div>
          <button className="btn-logout" onClick={logout}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
