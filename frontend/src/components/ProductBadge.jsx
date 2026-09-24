import React from 'react';

const PRODUCTS = {
  rms:  { label: 'RMS',  className: 'product-badge-rms' },
  hms:  { label: 'HMS',  className: 'product-badge-hms' },
  hrms: { label: 'HRMS', className: 'product-badge-hrms' },
};

export default function ProductBadge({ product }) {
  const cfg = PRODUCTS[product?.toLowerCase()] || { label: product, className: '' };
  return (
    <span className={`product-badge ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export function ProductBadgeList({ products = [] }) {
  if (!products.length) return <span style={{ color: 'var(--text-3)', fontSize: 13 }}>—</span>;
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {products.map(p => <ProductBadge key={p} product={p} />)}
    </div>
  );
}
