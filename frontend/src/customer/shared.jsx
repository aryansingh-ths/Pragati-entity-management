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

/** Tech backdrop: floating hexagons + interactive particle network. */
const HEX_DEFS = [
  { size: 72, x: '8%', y: '12%', anim: 'lp-hex-a', delay: '0s', color: '14,165,198', op: 0.13 },
  { size: 48, x: '82%', y: '7%', anim: 'lp-hex-b', delay: '-3s', color: '139,124,246', op: 0.14 },
  { size: 96, x: '90%', y: '38%', anim: 'lp-hex-a', delay: '-7s', color: '91,157,245', op: 0.10 },
  { size: 56, x: '3%', y: '55%', anim: 'lp-hex-b', delay: '-5s', color: '14,165,198', op: 0.12 },
  { size: 80, x: '68%', y: '72%', anim: 'lp-hex-a', delay: '-11s', color: '139,124,246', op: 0.10 },
  { size: 44, x: '40%', y: '90%', anim: 'lp-hex-b', delay: '-2s', color: '91,157,245', op: 0.13 },
  { size: 60, x: '25%', y: '20%', anim: 'lp-hex-a', delay: '-9s', color: '14,165,198', op: 0.09 },
  { size: 36, x: '55%', y: '48%', anim: 'lp-hex-b', delay: '-6s', color: '139,124,246', op: 0.11 },
];

function Hexagon({ size, x, y, anim, delay, color, op }) {
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = Math.PI / 3 * i - Math.PI / 6;
    return `${size / 2 + (size / 2 - 2) * Math.cos(a)},${size / 2 + (size / 2 - 2) * Math.sin(a)}`;
  }).join(' ');
  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', left: x, top: y, animation: `${anim} 18s ease-in-out infinite`, animationDelay: delay, willChange: 'transform, opacity' }}
    >
      <polygon points={pts} fill="none" stroke={`rgba(${color},${op})`} strokeWidth="1.5" />
    </svg>
  );
}

export function TechBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, raf, nodes = [];
    const mouse = { x: -9999, y: -9999 };
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const COLORS = ['14,165,198', '139,124,246', '91,157,245'];

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(30, Math.min(90, Math.floor((w * h) / 20000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.8,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
      }));
    };

    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; };
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; };

    const LINK = 140;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (!reduce) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > w) a.vx *= -1;
          if (a.y < 0 || a.y > h) a.vy *= -1;
        }
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < LINK) {
            ctx.strokeStyle = `rgba(${a.c},${(1 - d / LINK) * 0.22})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (md < 180) {
          ctx.strokeStyle = `rgba(14,165,198,${(1 - md / 180) * 0.45})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = `rgba(${a.c},0.65)`;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseout', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
    };
  }, []);

  return (
    <div className="lp-tech" aria-hidden="true">
      <div className="lp-tech-matrix" />
      <div className="lp-tech-glow" />
      {HEX_DEFS.map((h, i) => <Hexagon key={i} {...h} />)}
      <canvas ref={canvasRef} className="lp-tech-canvas" />
      <span className="lp-tech-ring lp-tech-ring-1" />
      <span className="lp-tech-ring lp-tech-ring-2" />
      <div className="lp-tech-code lp-tech-code-1">{'<pragati/> const deploy = await provision();'}</div>
      <div className="lp-tech-code lp-tech-code-2">{'{ status: "online", uptime: 99.99 }'}</div>
      <div className="lp-tech-code lp-tech-code-3">{'01001000 01101001 // connected'}</div>
    </div>
  );
}
