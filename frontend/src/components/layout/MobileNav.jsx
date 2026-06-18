import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Receipt, Boxes, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MobileNav() {
  const { isWorker } = useAuth();
  const navigate = useNavigate();

  if (isWorker) {
    return (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-bottom">
        <div className="grid grid-cols-3 h-16">
          <NavLink to="/dashboard" className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
            <LayoutDashboard size={20} />
            <span>Home</span>
          </NavLink>

          <button onClick={() => navigate('/sales/new')} className="flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg -mt-5">
              <Plus size={26} className="text-white" />
            </div>
          </button>

          <NavLink to="/sales" className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
            <ShoppingCart size={20} />
            <span>My Sales</span>
          </NavLink>
        </div>
      </nav>
    );
  }

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-bottom">
      <div className="grid grid-cols-5 h-16">
        <NavLink to="/dashboard" className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
          <LayoutDashboard size={20} />
          <span>Home</span>
        </NavLink>

        <NavLink to="/inventory" className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
          <Boxes size={20} />
          <span>Stock</span>
        </NavLink>

        <button onClick={() => navigate('/sales/new')} className="flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center shadow-lg -mt-5">
            <Plus size={26} className="text-white" />
          </div>
        </button>

        <NavLink to="/sales" className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
          <ShoppingCart size={20} />
          <span>Sales</span>
        </NavLink>

        <NavLink to="/expenses" className={({ isActive }) =>
          `flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
          <Receipt size={20} />
          <span>Expenses</span>
        </NavLink>
      </div>
    </nav>
  );
}
