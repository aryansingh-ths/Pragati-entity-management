import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import RouteGuard from './components/RouteGuard.jsx';
import Login from './pages/Login.jsx';
import Landing from './pages/Landing.jsx';
import Register from './pages/Register.jsx';
import Entities from './pages/Entities.jsx';
import EntityDetail from './pages/EntityDetail.jsx';
import Stats from './pages/Stats.jsx';
import Products from './pages/Products.jsx';
import Billing from './pages/Billing.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import Contact from './pages/Contact.jsx';
import Settings from './pages/Settings.jsx';

function AppRoutes() {
  return (
    <Routes>
      {/* Public — customer facing */}
      <Route path="/" element={<Landing />} />
      <Route path="/register" element={<Register />} />
      <Route path="/contact" element={<Contact />} />

      {/* Public — admin login */}
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route path="/entities" element={<RouteGuard><Entities /></RouteGuard>} />
      <Route path="/entities/:id" element={<RouteGuard><EntityDetail /></RouteGuard>} />
      <Route path="/stats" element={<RouteGuard><Stats /></RouteGuard>} />
      <Route path="/products" element={<RouteGuard><Products /></RouteGuard>} />
      <Route path="/billing" element={<RouteGuard><Billing /></RouteGuard>} />
      <Route path="/audits" element={<RouteGuard><AuditLogs /></RouteGuard>} />
      <Route path="/settings" element={<RouteGuard><Settings /></RouteGuard>} />

      {/* /dashboard → /entities */}
      <Route path="/dashboard" element={<Navigate to="/entities" replace />} />


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
