import { useEffect, useState } from 'react';
import { Bell, CheckCircle, Search } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import ErrorAlert from '../components/ui/ErrorAlert';

interface Alert {
  _id: string;
  type: string;
  severity: string;
  entityType: string;
  reason: string;
  status: string;
  explanation: { rule: string; inputs: Record<string, unknown> };
  createdAt: string;
  lastCheckedAt: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [severityFilter, setSeverityFilter] = useState('');
  const [ackNotes, setAckNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (severityFilter) params.set('severity', severityFilter);
      const res = await api.get(`/alerts?${params}&limit=100`);
      setAlerts(res.data.data);
    } catch { setError('Failed to load alerts.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter, severityFilter]);

  const acknowledge = async (id: string) => {
    try {
      await api.put(`/alerts/${id}/acknowledge`, { notes: ackNotes });
      load();
    } catch (err: any) { setError(err?.response?.data?.error?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-accent-primary" />
        <h1 className="text-xl font-bold text-text-primary">Alerts Center</h1>
        <span className="text-xs text-text-muted">All alerts are rule-based with full explanation</span>
      </div>

      {error && <ErrorAlert message={error} onRetry={load} />}

      <div className="glass-card p-3 flex gap-3">
        <select className="input-field py-1.5 text-xs w-32" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          {['open','acknowledged','resolved'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input-field py-1.5 text-xs w-32" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="">All severities</option>
          {['info','warning','critical'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <LoadingSpinner fullPage /> : alerts.length === 0 ? (
        <EmptyState icon={Bell} title={statusFilter === 'open' ? 'No open alerts — all clear' : 'No alerts found'} description="The alert engine runs every 5 minutes. You can trigger it manually from the Intelligence Center." />
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert._id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={alert.severity} />
                    <StatusBadge status={alert.status} />
                    <span className="text-xs text-text-muted capitalize">{alert.type.replace(/_/g, ' ')}</span>
                    <span className="text-xs text-text-muted">· {alert.entityType}</span>
                  </div>
                  <p className="text-sm text-text-primary">{alert.reason}</p>
                  <div className="mt-2 p-2 rounded bg-white/5">
                    <p className="text-[10px] text-text-muted">Rule: <span className="font-mono text-accent-secondary">{alert.explanation?.rule}</span></p>
                  </div>
                  <p className="text-xs text-text-muted mt-1 font-mono">Checked: {new Date(alert.lastCheckedAt).toLocaleString()}</p>
                </div>
                {alert.status === 'open' && (
                  <button
                    id={`ack-alert-${alert._id}`}
                    onClick={() => acknowledge(alert._id)}
                    className="flex items-center gap-1 text-xs text-status-success hover:text-green-400 flex-shrink-0"
                  >
                    <CheckCircle className="w-4 h-4" /> Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
