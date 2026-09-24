import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = sessionStorage.getItem('super_token');
    const username = sessionStorage.getItem('super_username');
    return token ? { token, username } : null;
  });

  const navigate = useNavigate();

  const login = useCallback(({ token, username }) => {
    sessionStorage.setItem('super_token', token);
    sessionStorage.setItem('super_username', username);
    setAuth({ token, username });
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/super/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout request failed', e);
    }
    sessionStorage.removeItem('super_token');
    sessionStorage.removeItem('super_username');
    setAuth(null);
    navigate('/login');
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
