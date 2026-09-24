import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Topbar from '../components/Topbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { apiFetch } from '../api/client.js';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/super/audits')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setLogs(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'var(--success)';
      case 'UPDATE': return 'var(--warning)';
      case 'DELETE': return 'var(--danger)';
      case 'SUSPEND': return 'var(--danger)';
      case 'ACTIVATE': return 'var(--success)';
      default: return 'var(--text-2)';
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Audit Logs" breadcrumbs={['System', 'Audit Logs']} />
      
      <div className="page-container">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>System Audit Logs</h1>
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 4 }}>
            Immutable ledger of all Super Administrator actions across the control plane.
          </p>
        </div>

        <div className="table-wrapper">
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner spinner-dark" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <span className="material-symbols-outlined empty-state-icon">history</span>
              <h3>No logs yet</h3>
              <p>Super admin actions will appear here.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Timestamp</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Target Type</th>
                  <th>Target ID</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td style={{ color: 'var(--text-2)', fontSize: '12px' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{log.username}</td>
                    <td>
                      <span style={{ 
                        color: getActionColor(log.action), 
                        fontWeight: 700, 
                        fontSize: 12, 
                        background: 'var(--surface-2)', 
                        padding: '3px 8px', 
                        borderRadius: 4, 
                        border: '1px solid var(--border-soft)'
                      }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-2)' }}>{log.entityType}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-1)' }}>{log.entityId}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text-3)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={JSON.stringify(log.details)}>
                      {Object.keys(log.details || {}).length > 0 ? JSON.stringify(log.details) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
