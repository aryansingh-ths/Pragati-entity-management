import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './customer.css';

/** Soft, light accent palette cycled across products. */
export const ACCENTS = ['#0ea5c6', '#8b7cf6', '#f2a93b', '#34b98a', '#ec6fa3', '#5b9df5'];
export const accentFor = (i) => ACCENTS[i % ACCENTS.length];

export const inr = (n) =>
  '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

/** Fetches the admin-managed product catalog from the public API. */
export function useProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public/products');
      if (!res.ok) throw new Error();
      setProducts(await res.json());
    } catch {
      setError('We could not load our products right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { products, loading, error, reload: load };
}

/** Fetches global system configuration (taxes, discounts). */
export function useConfig() {
  const [config, setConfig] = useState({ taxes: [{ name: 'GST', rate: 18 }], yearly_months_charged: 10 });
  const [loadingConfig, setLoadingConfig] = useState(true);

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/public/config');
      if (res.ok) setConfig(await res.json());
    } catch {
      // silently fall back to defaults
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);
  return { config, loadingConfig, reloadConfig: loadConfig };
}

/** Fades/slides children in when they scroll into view. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`lp-reveal${shown ? ' lp-reveal-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Animated number that counts up once visible. */
export function CountUp({ to, suffix = '', prefix = '', duration = 1400 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf;
    const run = () => {
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / duration);
        setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (typeof IntersectionObserver === 'undefined') { setVal(to); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [to, duration]);

  return <span ref={ref}>{prefix}{val}{suffix}</span>;
}

export function BrandLogo({ size = 44, textSize, to = '/' }) {
  return (
    <Link to={to} className="lp-brand" aria-label="Pragati home">
      <img src="/techhansa-logo.png" alt="" style={{ height: size }} />
      <span className="lp-brand-text" style={textSize ? { fontSize: textSize } : {}}>Pragati</span>
    </Link>
  );
}

/** Soft animated background blobs shared by customer pages. */
export function AuroraBackground() {
  return (
    <div className="lp-aurora" aria-hidden="true">
      <span className="lp-blob lp-blob-1" />
      <span className="lp-blob lp-blob-2" />
      <span className="lp-blob lp-blob-3" />
    </div>
  );
}
