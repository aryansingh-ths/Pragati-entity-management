import React, { useEffect, useRef } from 'react';

function countUp(el, target, duration = 1200) {
  if (!el) return;
  const start = performance.now();
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

export default function StatCard({ label, value, icon, color = 'var(--accent)', sub }) {
  const numRef = useRef(null);

  useEffect(() => {
    if (typeof value === 'number') {
      countUp(numRef.current, value);
    }
  }, [value]);

  return (
    <div className="stat-card" style={{ '--stat-color': color }}>
      <div className="stat-card-icon">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value" ref={numRef}>
        {typeof value === 'number' ? '0' : value ?? '—'}
      </div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}
