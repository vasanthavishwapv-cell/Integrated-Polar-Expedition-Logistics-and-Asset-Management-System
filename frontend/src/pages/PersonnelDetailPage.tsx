import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Clock } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';

interface Personnel {
  _id: string;
  personnelId: string;
  name: string;
  role: string;
  department: string;
  email: string;
  assignedStation?: { name: string; code: string };
  linkedExpedition?: { name: string; status: string };
  currentStatus: string;
}

interface Movement {
  _id: string;
  eventType: string;
  fromStatus?: string;
  toStatus: string;
  location?: string;
  notes?: string;
  recordedBy: { name: string };
  createdAt: string;
}

export default function PersonnelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [person, setPerson] = useState<Personnel | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [pRes, mRes] = await Promise.all([
        api.get(`/personnel/${id}`),
        api.get(`/personnel/${id}/history`),
      ]);
      setPerson(pRes.data.data);
      setMovements(mRes.data.data);
    } catch { setError('Personnel record not found or access denied.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <LoadingSpinner fullPage />;
  if (!person) return <ErrorAlert message={error} onRetry={load} />;

  return (
    <div className="space-y-5 max-w-3xl">
      <button onClick={() => navigate('/personnel')} className="flex items-center gap-2 text-text-muted hover:text-text-primary text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Personnel
      </button>

      <div className="glass-card p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-primary/20 flex items-center justify-center text-accent-primary text-xl font-bold">
            {person.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-text-primary">{person.name}</h1>
              <StatusBadge status={person.currentStatus} size="md" />
            </div>
            <p className="text-sm text-text-muted">{person.role} · {person.department}</p>
            <p className="text-xs font-mono text-text-muted mt-0.5">{person.personnelId}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[rgba(148,163,184,0.1)]">
          <div>
            <p className="text-xs text-text-muted">Email</p>
            <p className="text-sm">{person.email}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Station</p>
            <p className="text-sm font-mono">{person.assignedStation?.code || '—'} {person.assignedStation?.name}</p>
          </div>
          {person.linkedExpedition && (
            <div>
              <p className="text-xs text-text-muted">Expedition</p>
              <p className="text-sm">{person.linkedExpedition.name}</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-[10px] text-amber-400 flex items-center gap-1">
          <span className="simulated-badge">Self-Reported</span>
          Location data reflects self-reported check-in/check-out events, not live GPS tracking
        </p>
      </div>

      <div className="glass-card p-5">
        <h2 className="section-header"><Clock className="w-4 h-4 text-accent-primary" /> Movement History</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-text-muted">No movement history recorded</p>
        ) : (
          <div className="space-y-2">
            {movements.map((m) => (
              <div key={m._id} className="flex items-start gap-3 p-2 rounded-lg bg-white/5">
                <div className="w-2 h-2 rounded-full bg-accent-primary mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium capitalize">{m.eventType.replace(/_/g, ' ')}</span>
                    {m.fromStatus && <><StatusBadge status={m.fromStatus} /><span className="text-xs text-text-muted">→</span></>}
                    <StatusBadge status={m.toStatus} />
                  </div>
                  {m.location && <p className="text-xs text-text-muted mt-0.5">📍 {m.location}</p>}
                  {m.notes && <p className="text-xs text-text-muted italic">{m.notes}</p>}
                  <p className="text-xs font-mono text-text-muted mt-0.5">{new Date(m.createdAt).toLocaleString()} by {m.recordedBy?.name}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
