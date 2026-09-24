import React from 'react';

const STATUS_MAP = {
  active:    { label: 'Active',    cls: 'status-active' },
  suspended: { label: 'Suspended', cls: 'status-suspended' },
  trial:     { label: 'Trial',     cls: 'status-trial' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { label: status, cls: '' };
  return <span className={`status-badge ${cfg.cls}`}>{cfg.label}</span>;
}
