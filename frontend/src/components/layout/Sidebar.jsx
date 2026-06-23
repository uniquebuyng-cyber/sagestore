import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Store, Package, Boxes, ShoppingCart,
  Receipt, Users, ArrowLeftRight, BarChart3, X, LogOut, Droplets, Landmark,
} from 'lucide-react';

const ownerNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/outlets', icon: Store, label: 'Outlets' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/inventory', icon: Boxes, label: 'Inventory' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/transfers', icon: ArrowLeftRight, label: 'Transfers' },
  { to: '/workers', icon: Users, label: 'Workers' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/accounts', icon: Landmark, label: 'Accounts' },
];

const workerNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/inventory', icon: Boxes, label: 'Inventory' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
];

const managerNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/outlets', icon: Store, label: 'My Outlet' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/inventory', icon: Boxes, label: 'Inventory' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/transfers', icon: ArrowLeftRight, label: 'Transfers' },
  { to: '/workers', icon: Users, label: 'Workers' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout, isOwner, isManager } = useAuth();
  const navigate = useNavigate();

  const navItems = isOwner ? ownerNav : isManager ? managerNav : workerNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`
      fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out
      lg:relative lg:translate-x-0
      ${open ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
            <Droplets size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">Sage Store</p>
            <p className="text-xs text-gray-400">Management System</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-gray-700">
        <p className="text-sm font-medium truncate">{user?.name}</p>
        <p className="text-xs text-gray-400 capitalize">{user?.role} {user?.outlet?.name ? `— ${user.outlet.name}` : ''}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4 border-t border-gray-700 pt-3">
        <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white w-full transition-colors">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}
