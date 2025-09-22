import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { LogOut, User, BarChart3 } from 'lucide-react';
import { config } from '../../../../lib/config';

type AdminLayoutProps = {
  children: React.ReactNode;
  fullscreen?: boolean;
};

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, fullscreen = false }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch(`${config.api.baseUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      });
    } catch {}
    navigate('/');
  };

  return (
    <div className="min-h-dvh bg-[#F7F9FC]">
      <header className="sticky top-0 z-20 w-full border-b border-gray-200 bg-white/80 backdrop-blur">
        <div className="w-full px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-[#0C54EA] p-1 flex items-center justify-center">
                <img src="/logo/logo.svg" alt="Logo" className="w-full h-full p-0.5" />
              </div>
              <div className="text-sm font-semibold tracking-wide">Dashboard</div>
            </div>
            <nav className="ml-6 hidden md:flex items-center gap-2">
              <NavLink to="/admin/dashboard" className={({ isActive }) => `px-3 py-1.5 rounded-md text-sm ${isActive ? 'bg-[#0C54EA]/10 text-[#0C54EA]' : 'text-gray-700 hover:bg-gray-100'}`}>Overview</NavLink>
              <NavLink to="/admin/user-analytics" className={({ isActive }) => `px-3 py-1.5 rounded-md text-sm ${isActive ? 'bg-[#0C54EA]/10 text-[#0C54EA]' : 'text-gray-700 hover:bg-gray-100'}`}>User Analytics</NavLink>
              <NavLink to="/admin/monetization" className={({ isActive }) => `px-3 py-1.5 rounded-md text-sm ${isActive ? 'bg-[#0C54EA]/10 text-[#0C54EA]' : 'text-gray-700 hover:bg-gray-100'}`}>Monetization & Revenue</NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5">
              <BarChart3 className="w-4 h-4 text-[#0C54EA]" />
              <span className="text-sm font-medium text-gray-900">Monthly Revenue:</span>
              <span className="text-sm font-semibold text-[#0C54EA]" aria-live="polite" aria-atomic="true">—</span>
            </div>
            <button aria-label="Profile" onClick={() => navigate('/profile')} className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </button>
            <button aria-label="Logout" onClick={() => navigate('/home')} className="inline-flex items-center gap-2 rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {fullscreen ? (
        <main className="w-full h-[calc(100vh-57px)] overflow-hidden">
          {children}
        </main>
      ) : (
        <main className="w-full px-4 py-6">
          {children}
        </main>
      )}
    </div>
  );
};

export default AdminLayout;


