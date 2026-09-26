import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, Package, Archive, Brain, Users,
  Wrench, AlertTriangle, Bell, Settings, LogOut, Radio,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/expeditions', icon: Map, label: 'Expeditions' },
  { to: '/cargo', icon: Package, label: 'Cargo & Shipments' },
  { to: '/inventory', icon: Archive, label: 'Inventory' },
  { to: '/intelligence', icon: Brain, label: 'Intelligence' },
  { to: '/personnel', icon: Users, label: 'Personnel' },
  { to: '/assets', icon: Wrench, label: 'Assets' },
  { to: '/emergency', icon: AlertTriangle, label: 'Emergency' },
  { to: '/alerts', icon: Bell, label: 'Alerts' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    clearAuth();
    navigate('/login');
  };

  return (
    <aside
      className={`flex flex-col bg-bg-secondary border-r border-[#C6C7BD]/50 transition-all duration-300 relative ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 border-b border-[#C6C7BD]/50 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#1C2B3C] flex items-center justify-center text-white shadow-sm">
          <Radio className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-sm text-[#1C2B3C] tracking-wide leading-none">POLARIS</div>
            <div className="text-[10px] text-text-muted leading-none mt-1 font-medium">Polar Operations</div>
          </div>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2.5 border-t border-[#C6C7BD]/50 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
        <button
          onClick={handleLogout}
          className={`nav-link w-full text-status-danger hover:bg-red-50 hover:text-red-700 ${collapsed ? 'justify-center px-2' : ''}`}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute bottom-28 -right-3 w-6 h-6 rounded-full bg-white border border-[#C6C7BD] shadow-sm flex items-center justify-center text-[#4B5C6C] hover:text-[#1C2B3C] hover:border-[#1C2B3C] transition-all z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
