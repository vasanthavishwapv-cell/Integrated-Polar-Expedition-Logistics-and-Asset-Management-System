import { Bell, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useSyncStore } from '../../store/syncStore';

const ROLE_LABELS: Record<string, string> = {
  admin: 'System Admin',
  expedition_coordinator: 'Expedition Coordinator',
  logistics_officer: 'Logistics Officer',
  inventory_manager: 'Inventory Manager',
  personnel_coordinator: 'Personnel Coordinator',
  emergency_coordinator: 'Emergency Coordinator',
  station_ops: 'Station Ops',
};

export default function Navbar() {
  const { user } = useAuthStore();
  const { isOnline, pendingCount, lastSyncAt } = useSyncStore();

  return (
    <header className="h-14 border-b border-[rgba(148,163,184,0.1)] bg-bg-secondary px-6 flex items-center justify-between flex-shrink-0">
      {/* Left: breadcrumb / title placeholder */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-mono text-text-muted">
          {new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC
        </span>
      </div>

      {/* Right: sync status + user */}
      <div className="flex items-center gap-4">
        {/* Sync status */}
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-status-success" />
          ) : (
            <WifiOff className="w-4 h-4 text-status-warning animate-pulse" />
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-status-warning">
              <RefreshCw className="w-3 h-3 animate-spin" />
              {pendingCount} pending
            </span>
          )}
          {lastSyncAt && pendingCount === 0 && (
            <span className="text-xs text-text-muted">
              Synced {lastSyncAt.toLocaleTimeString()}
            </span>
          )}
        </div>

        {/* Alert indicator */}
        <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors" aria-label="Notifications">
          <Bell className="w-4 h-4 text-text-muted" />
        </button>

        {/* User badge */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary text-xs font-bold">
            {user?.name?.charAt(0) || '?'}
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-medium text-text-primary leading-none">{user?.name}</div>
            <div className="text-[10px] text-text-muted leading-none mt-0.5">
              {ROLE_LABELS[user?.role || ''] || user?.role}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
