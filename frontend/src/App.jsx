import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Setup from './pages/auth/Setup';
import Dashboard from './pages/dashboard/Dashboard';
import Outlets from './pages/outlets/Outlets';
import OutletDetail from './pages/outlets/OutletDetail';
import Products from './pages/products/Products';
import Inventory from './pages/inventory/Inventory';
import Sales from './pages/sales/Sales';
import NewSale from './pages/sales/NewSale';
import Expenses from './pages/expenses/Expenses';
import Workers from './pages/workers/Workers';
import Transfers from './pages/transfers/Transfers';
import Reports from './pages/reports/Reports';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/setup" element={<Setup />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/outlets" element={<ProtectedRoute roles={['owner', 'manager']}><Outlets /></ProtectedRoute>} />
        <Route path="/outlets/:id" element={<ProtectedRoute roles={['owner', 'manager']}><OutletDetail /></ProtectedRoute>} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/sales/new" element={<NewSale />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/workers" element={<ProtectedRoute roles={['owner', 'manager']}><Workers /></ProtectedRoute>} />
        <Route path="/transfers" element={<ProtectedRoute roles={['owner', 'manager']}><Transfers /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute roles={['owner', 'manager']}><Reports /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
