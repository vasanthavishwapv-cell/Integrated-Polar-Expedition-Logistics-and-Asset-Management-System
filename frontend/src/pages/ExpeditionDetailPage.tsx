import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, ChevronRight, Users, CalendarDays } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';
import Modal from '../components/ui/Modal';

interface Expedition {
  _id: string;
  name: string;
  missionType: string;
  destination: { name: string; code: string; location: string };
  startDate: string;
  endDate: string;
  status: string;
  planningProgress: number;
  description: string;
  assignedPersonnel: Array<{ _id: string; name: string; role: string }>;
  requiredResources: Array<{ item: string; quantity: number; unit: string }>;
  createdAt: string;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['planned', 'cancelled'],
  planned: ['active', 'cancelled'],
  active: ['completed'],
  completed: [],
  cancelled: [],
};

export default function ExpeditionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expedition, setExpedition] = useState<Expedition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  const load = async () => {
    try {
      const res = await api.get(`/expeditions/${id}`);
      setExpedition(res.data.data);
    } catch {
      setError('Expedition not found or access denied.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleStatusChange = async () => {
    if (!targetStatus || !expedition) return;
    setTransitioning(true);
    try {
      await api.put(`/expeditions/${id}`, { status: targetStatus });
      setShowTransitionModal(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Status change failed');
    } finally {
      setTransitioning(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage text="Loading expedition..." />;
  if (error) return <ErrorAlert message={error} onRetry={load} />;
  if (!expedition) return null;

  const nextStatuses = STATUS_TRANSITIONS[expedition.status] || [];

  return (
    <div className="space-y-5 max-w-4xl">
      <button onClick={() => navigate('/expeditions')} className="flex items-center gap-2 text-text-muted hover:text-text-primary text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Expeditions
      </button>

      {/* Header */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={expedition.status} size="md" />
              <span className="text-xs text-text-muted capitalize">{expedition.missionType}</span>
            </div>
            <h1 className="text-xl font-bold text-text-primary">{expedition.name}</h1>
            <p className="text-sm text-text-muted mt-1">{expedition.description}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {nextStatuses.length > 0 && (
              <select
                className="input-field text-xs py-1.5 w-36"
                value=""
                onChange={(e) => { setTargetStatus(e.target.value); setShowTransitionModal(true); }}
              >
                <option value="">Move to...</option>
                {nextStatuses.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[rgba(148,163,184,0.1)]">
          <div>
            <p className="text-xs text-text-muted">Station</p>
            <p className="text-sm font-medium flex items-center gap-1">
              <span className="font-mono text-accent-primary">{expedition.destination?.code}</span>
              {expedition.destination?.name}
            </p>
            <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
              <span className="simulated-badge">Simulated</span>
              Location data is representative
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Start Date</p>
            <p className="text-sm font-mono">{new Date(expedition.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">End Date</p>
            <p className="text-sm font-mono">{new Date(expedition.endDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Planning Progress</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-accent-primary rounded-full transition-all" style={{ width: `${expedition.planningProgress}%` }} />
              </div>
              <span className="text-sm font-medium">{expedition.planningProgress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Personnel & Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card p-5">
          <h2 className="section-header"><Users className="w-4 h-4 text-accent-primary" /> Assigned Personnel ({expedition.assignedPersonnel?.length || 0})</h2>
          {!expedition.assignedPersonnel?.length ? (
            <p className="text-sm text-text-muted">No personnel assigned yet</p>
          ) : (
            <div className="space-y-2">
              {expedition.assignedPersonnel.map((p) => (
                <div key={p._id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-text-muted">{p.role}</p>
                  </div>
                  <button onClick={() => navigate(`/personnel/${p._id}`)} className="text-accent-primary">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <h2 className="section-header"><CalendarDays className="w-4 h-4 text-accent-primary" /> Required Resources ({expedition.requiredResources?.length || 0})</h2>
          {!expedition.requiredResources?.length ? (
            <p className="text-sm text-text-muted">No resources listed</p>
          ) : (
            <div className="space-y-2">
              {expedition.requiredResources.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg bg-white/5">
                  <span>{r.item}</span>
                  <span className="font-mono text-text-muted">{r.quantity} {r.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status transition confirm */}
      <Modal isOpen={showTransitionModal} onClose={() => setShowTransitionModal(false)} title="Confirm Status Change"
        footer={
          <>
            <button onClick={() => setShowTransitionModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleStatusChange} disabled={transitioning} className="btn-primary">
              {transitioning ? 'Updating...' : `Move to ${targetStatus}`}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Move expedition <strong className="text-text-primary">{expedition.name}</strong> from{' '}
          <StatusBadge status={expedition.status} /> to <StatusBadge status={targetStatus} />?
        </p>
        <p className="text-xs text-text-muted mt-3">This action will be logged in the audit trail.</p>
      </Modal>
    </div>
  );
}
