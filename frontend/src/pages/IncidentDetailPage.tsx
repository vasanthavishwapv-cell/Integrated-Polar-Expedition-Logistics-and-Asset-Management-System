import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ChevronRight, Plus } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';
import Modal from '../components/ui/Modal';
import { useForm } from 'react-hook-form';

interface Incident {
  _id: string;
  incidentId: string;
  type: string;
  description: string;
  location: string;
  station?: { name: string; code: string };
  severity: string;
  status: string;
  reportedTime: string;
  assignedCoordinator?: { name: string; email: string };
  requiredResources: string[];
  affectedPersonnel: Array<{ name: string; role: string }>;
  responseActions: Array<{ action: string; performedBy: string; timestamp: string; notes?: string }>;
  resolutionNotes?: string;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  reported: ['acknowledged'],
  acknowledged: ['assessing'],
  assessing: ['response_in_progress', 'resolved'],
  response_in_progress: ['resolved'],
  resolved: ['closed'],
  closed: [],
};

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { action: '', performedBy: '', timestamp: new Date().toISOString().slice(0, 16), notes: '' },
  });

  const load = async () => {
    try {
      const res = await api.get(`/incidents/${id}`);
      setIncident(res.data.data);
    } catch { setError('Incident not found.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = async (newStatus: string) => {
    setTransitioning(true);
    try {
      await api.put(`/incidents/${id}/status`, { status: newStatus });
      load();
    } catch (err: any) { setError(err?.response?.data?.error?.message || 'Failed'); }
    finally { setTransitioning(false); }
  };

  const addAction = async (data: any) => {
    try {
      await api.post(`/incidents/${id}/actions`, { ...data, timestamp: new Date(data.timestamp).toISOString() });
      reset(); setShowActionModal(false); load();
    } catch (err: any) { setError(err?.response?.data?.error?.message || 'Failed'); }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!incident) return <ErrorAlert message={error || 'Not found'} onRetry={load} />;
  const nextStatuses = STATUS_TRANSITIONS[incident.status] || [];

  return (
    <div className="space-y-5 max-w-3xl">
      <button onClick={() => navigate('/emergency')} className="flex items-center gap-2 text-text-muted hover:text-text-primary text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Emergency
      </button>

      {error && <ErrorAlert message={error} />}

      <div className={`glass-card p-5 ${incident.severity === 'critical' ? 'border-status-danger/50' : ''}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={incident.severity} size="md" />
              <StatusBadge status={incident.status} size="md" />
              <span className="font-mono text-xs text-text-muted">{incident.incidentId}</span>
            </div>
            <h1 className="text-lg font-bold text-text-primary">{incident.description}</h1>
            <p className="text-sm text-text-muted">{incident.location} {incident.station ? `· ${incident.station.name}` : ''}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.map((s) => (
              <button key={s} disabled={transitioning} onClick={() => updateStatus(s)} className="btn-secondary text-xs py-1.5">
                → {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[rgba(148,163,184,0.1)]">
          <div>
            <p className="text-xs text-text-muted">Reported Time</p>
            <p className="text-sm font-mono">{new Date(incident.reportedTime).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Type</p>
            <p className="text-sm capitalize">{incident.type.replace(/_/g, ' ')}</p>
          </div>
          {incident.assignedCoordinator && (
            <div>
              <p className="text-xs text-text-muted">Coordinator</p>
              <p className="text-sm">{incident.assignedCoordinator.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Response actions timeline */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-header mb-0"><Clock className="w-4 h-4 text-accent-primary" /> Response Timeline</h2>
          <button onClick={() => setShowActionModal(true)} className="btn-secondary text-xs flex items-center gap-1 py-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Action
          </button>
        </div>
        {incident.responseActions.length === 0 ? (
          <p className="text-sm text-text-muted">No response actions recorded yet</p>
        ) : (
          <div className="space-y-3">
            {incident.responseActions.map((action, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-primary flex-shrink-0 mt-1" />
                  {i < incident.responseActions.length - 1 && <div className="w-px flex-1 bg-accent-primary/20 mt-1" />}
                </div>
                <div className="pb-3">
                  <p className="text-sm font-medium">{action.action}</p>
                  <p className="text-xs text-text-muted">{action.performedBy} · {new Date(action.timestamp).toLocaleString()}</p>
                  {action.notes && <p className="text-xs text-text-muted mt-0.5 italic">{action.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showActionModal} onClose={() => setShowActionModal(false)} title="Add Response Action"
        footer={
          <>
            <button onClick={() => setShowActionModal(false)} className="btn-secondary">Cancel</button>
            <button form="action-form" type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Adding...' : 'Add'}</button>
          </>
        }
      >
        <form id="action-form" onSubmit={handleSubmit(addAction)} className="space-y-3">
          <div><label className="block text-xs text-text-muted mb-1">Action Taken *</label><textarea {...register('action')} className="input-field" rows={2} placeholder="Describe the response action..." /></div>
          <div><label className="block text-xs text-text-muted mb-1">Performed By *</label><input {...register('performedBy')} className="input-field" placeholder="Name / role" /></div>
          <div><label className="block text-xs text-text-muted mb-1">Timestamp</label><input type="datetime-local" {...register('timestamp')} className="input-field" /></div>
          <div><label className="block text-xs text-text-muted mb-1">Notes</label><input {...register('notes')} className="input-field" /></div>
        </form>
      </Modal>
    </div>
  );
}
