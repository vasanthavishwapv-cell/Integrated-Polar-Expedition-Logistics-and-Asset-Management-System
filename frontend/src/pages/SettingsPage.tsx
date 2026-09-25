import { Settings, User, Database, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useSyncStore } from '../store/syncStore';

const ROLE_LABELS: Record<string, string> = {
  admin: 'System Administrator',
  expedition_coordinator: 'Expedition Coordinator',
  logistics_officer: 'Logistics Officer',
  inventory_manager: 'Inventory Manager',
  personnel_coordinator: 'Personnel Coordinator',
  emergency_coordinator: 'Emergency Coordinator',
  station_ops: 'Station Operations',
};

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { pendingCount, lastSyncAt, queue } = useSyncStore();

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings className="w-5 h-5 text-accent-primary" />
        <h1 className="text-xl font-bold text-text-primary">Settings</h1>
      </div>

      {/* Profile */}
      <div className="glass-card p-5">
        <h2 className="section-header"><User className="w-4 h-4 text-accent-primary" /> Profile</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-muted">Name</p>
            <p className="text-sm font-medium">{user?.name}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Email</p>
            <p className="text-sm font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Role</p>
            <p className="text-sm font-medium">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">User ID</p>
            <p className="text-xs font-mono text-text-muted">{user?.id}</p>
          </div>
        </div>
      </div>

      {/* Offline Sync Queue */}
      <div className="glass-card p-5">
        <h2 className="section-header"><Database className="w-4 h-4 text-accent-primary" /> Offline Sync Queue</h2>
        <div className="flex gap-6 mb-4">
          <div>
            <p className="text-xs text-text-muted">Pending</p>
            <p className="text-xl font-bold">{pendingCount}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Last Synced</p>
            <p className="text-sm">{lastSyncAt ? lastSyncAt.toLocaleString() : '—'}</p>
          </div>
        </div>
        {queue.length === 0 ? (
          <p className="text-sm text-status-success">✓ Queue empty — all synced</p>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {queue.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs p-2 rounded bg-white/5">
                <span className="text-text-muted font-mono">{item.action}</span>
                <span className={item.status === 'failed' ? 'text-status-danger' : 'text-status-warning'}>{item.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permissions summary */}
      <div className="glass-card p-5">
        <h2 className="section-header"><Shield className="w-4 h-4 text-accent-primary" /> Your Permissions</h2>
        <p className="text-xs text-text-muted mb-3">Permissions are enforced server-side by the RBAC middleware for every request.</p>
        <div className="p-3 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
          <p className="text-sm text-accent-primary font-medium">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
          <p className="text-xs text-text-muted mt-1">See the project documentation for the full permissions matrix.</p>
        </div>
      </div>

      {/* System info */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>POLARIS v1.0.0 — SIH2026 Demo Build</span>
          <span className="simulated-badge">Demo Data</span>
        </div>
        <p className="text-[10px] text-text-muted mt-1">All data is simulated for hackathon demonstration purposes. Labels: [Simulated] = pre-seeded, [Demo Data] = generated, [Model Estimate] = algorithm output.</p>
      </div>
    </div>
  );
}
