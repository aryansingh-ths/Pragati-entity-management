import React from 'react';
import { Navigate } from 'react-router-dom';

export default function RouteGuard({ children }) {
  const token = sessionStorage.getItem('super_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
