import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

/**
 * AppShell — shared layout wrapper for all authenticated pages.
 * Handles the mobile sidebar toggle state in one place so individual
 * pages don't need to manage it themselves.
 */
export default function AppShell({ title, breadcrumbs, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Topbar
          title={title}
          breadcrumbs={breadcrumbs}
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
        />
        <div className="page-container fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
