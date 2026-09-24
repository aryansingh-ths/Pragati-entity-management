import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import RouteGuard from './components/RouteGuard.jsx';
import Login from './pages/Login.jsx';
import Entities from './pages/Entities.jsx';
import EntityDetail from './pages/EntityDetail.jsx';
import Stats from './pages/Stats.jsx';
import Products from './pages/Products.jsx';
import Billing from './pages/Billing.jsx';
import AuditLogs from './pages/AuditLogs.jsx';

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route path="/entities" element={<RouteGuard><Entities /></RouteGuard>} />
      <Route path="/entities/:id" element={<RouteGuard><EntityDetail /></RouteGuard>} />
      <Route path="/stats" element={<RouteGuard><Stats /></RouteGuard>} />
      <Route path="/products" element={<RouteGuard><Products /></RouteGuard>} />
      <Route path="/billing" element={<RouteGuard><Billing /></RouteGuard>} />
      <Route path="/audits" element={<RouteGuard><AuditLogs /></RouteGuard>} />

      {/* /dashboard → /entities */}
      <Route path="/dashboard" element={<Navigate to="/entities" replace />} />

      {/* Root: redirect based on auth */}
      <Route
        path="/"
        element={
          sessionStorage.getItem('super_token')
            ? <Navigate to="/entities" replace />
            : <Navigate to="/login" replace />
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
