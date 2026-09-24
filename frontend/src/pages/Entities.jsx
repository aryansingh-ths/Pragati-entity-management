import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';
import StatCard from '../components/StatCard.jsx';
import EntityTable from '../components/EntityTable.jsx';
import CreateEntityDrawer from '../components/CreateEntityDrawer.jsx';
import SuccessCredentialsModal from '../components/SuccessCredentialsModal.jsx';
import { apiFetch } from '../api/client.js';

export default function Entities() {
  const [entities, setEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [stats, setStats] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [successData, setSuccessData] = useState(null);

  async function fetchEntities() {
    setLoadingEntities(true);
    try {
      const res = await apiFetch('/api/super/entities');
      if (res.ok) {
        const data = await res.json();
        setEntities(data);
      }
    } finally {
      setLoadingEntities(false);
    }
  }

  async function fetchStats() {
    try {
      const res = await apiFetch('/api/super/stats');
      if (res.ok) setStats(await res.json());
    } catch {}
  }

  useEffect(() => {
    fetchEntities();
    fetchStats();
  }, []);

  function handleEntityCreated(data) {
    setShowDrawer(false);
    setSuccessData(data);
    fetchEntities();
    fetchStats();
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title="Entities" />
        <div className="page-container fade-in">
          {/* Header */}
          <div className="dashboard-header">
            <h1>Entity Management</h1>
          </div>

          {/* Stats Banner */}
          <div className="stats-banner">
            <StatCard
              label="Total Entities"
              value={stats?.total_entities}
              icon="corporate_fare"
              color="var(--accent)"
            />
            <StatCard
              label="Active"
              value={stats?.by_status?.active}
              icon="check_circle"
              color="var(--success)"
            />
            <StatCard
              label="Suspended"
              value={stats?.by_status?.suspended}
              icon="pause_circle"
              color="var(--danger)"
            />
            <StatCard
              label="Total Users"
              value={stats?.total_users}
              icon="group"
              color="#a78bfa"
            />
          </div>

          {/* Entity Table with toolbar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              className="btn btn-primary"
              onClick={() => setShowDrawer(true)}
            >
              <span className="material-symbols-outlined">add_business</span>
              New Entity
            </button>
          </div>

          <EntityTable
            entities={entities}
            loading={loadingEntities}
            onRefresh={() => { fetchEntities(); fetchStats(); }}
          />
        </div>
      </div>

      {/* Create Entity Drawer */}
      {showDrawer && (
        <CreateEntityDrawer
          onClose={() => setShowDrawer(false)}
          onSuccess={handleEntityCreated}
        />
      )}

      {/* Success Credentials Modal */}
      {successData && (
        <SuccessCredentialsModal
          data={successData}
          onClose={() => setSuccessData(null)}
        />
      )}
    </div>
  );
}
