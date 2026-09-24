import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (auth?.token) navigate('/entities', { replace: true });
  }, [auth]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.username || !form.password) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/super/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials. Please try again.');
        return;
      }
      login({ token: data.token, username: data.username });
      navigate('/entities', { replace: true });
    } catch {
      setError('Network error. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-glow" />

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px' }}>
            <img src="/techhansa-logo.png" alt="Techhansa" style={{ height: '86px', objectFit: 'contain' }} />
            <div className="logo-text">Pragati</div>
          </div>
          <div style={{ marginTop: 6 }}>
            <div className="login-badge">
              <span className="material-symbols-outlined" style={{ fontSize: 12 }}>shield</span>
              Control Plane — Techhansa Internal
            </div>
          </div>
        </div>



        {error && (
          <div className="login-error" style={{ marginBottom: 16 }}>
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 18, color: 'var(--text-3)', pointerEvents: 'none'
              }}>person</span>
              <input
                className="form-input"
                style={{ paddingLeft: 40 }}
                type="text"
                placeholder="techhansa_admin"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 18, color: 'var(--text-3)', pointerEvents: 'none'
              }}>lock</span>
              <input
                className="form-input"
                style={{ paddingLeft: 40, paddingRight: 44 }}
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer',
                  display: 'flex', padding: 2,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {showPass ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 4 }}
          >
            {loading ? (
              <><span className="spinner" /> Signing in…</>
            ) : (
              <><span className="material-symbols-outlined">login</span> Sign In</>
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '14px', background: 'rgba(13,148,136,0.15)', borderRadius: 10, border: '1px solid rgba(20,184,166,0.3)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#5eead4', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
            Internal Access Only
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.6 }}>
            This portal is restricted to authorised Techhansa operators. Unauthorized access is strictly prohibited.
          </div>
        </div>
      </div>
    </div>
  );
}
