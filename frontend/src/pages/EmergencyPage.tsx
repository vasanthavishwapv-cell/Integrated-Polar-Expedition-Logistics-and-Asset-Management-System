import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus, Search, Shield } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
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
}

export default function EmergencyPage() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stations, setStations] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      type: 'medical', description: '', location: '', severity: 'medium', station: '',
    },
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter) params.set('severity', severityFilter);
      if (statusFilter) params.set('status', statusFilter);
      const [incRes, sRes] = await Promise.all([api.get(`/incidents?${params}`), api.get('/stations')]);
      setIncidents(incRes.data.data);
      setStations(sRes.data.data);
    } catch { setError('Failed to load incidents.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [severityFilter, statusFilter]);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/incidents', data);
      reset(); setShowCreate(false); load();
    } catch (err: any) { setError(err?.response?.data?.error?.message || 'Failed to create incident'); }
  };

  const filtered = incidents.filter((i) =>
    i.description.toLowerCase().includes(search.toLowerCase()) ||
    i.location.toLowerCase().includes(search.toLowerCase()) ||
    i.incidentId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-status-danger" />
        <h1 className="text-xl font-bold text-text-primary">Emergency Response</h1>
        <button onClick={() => setShowCreate(true)} className="btn-danger ml-auto flex items-center gap-2 text-sm" id="create-incident-btn">
          <Plus className="w-4 h-4" /> Report Incident
        </button>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-status-warning/10 border border-status-warning/20 text-xs text-status-warning">
        <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>This system coordinates information visibility only. It is <strong>not</strong> a replacement for verified emergency procedures or real dispatch systems.</span>
      </div>

      {error && <ErrorAlert message={error} onRetry={load} />}

      <div className="glass-card p-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input className="input-field pl-9 py-1.5 text-xs" placeholder="Search incidents..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field py-1.5 text-xs w-32" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
          <option value="">All severities</option>
          {['low','medium','high','critical'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input-field py-1.5 text-xs w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['reported','acknowledged','assessing','response_in_progress','resolved','closed'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? <LoadingSpinner fullPage /> : filtered.length === 0 ? (
        <EmptyState icon={AlertTriangle} title="No incidents found" description="No active incidents. Good news!" action={{ label: 'Report Incident', onClick: () => setShowCreate(true) }} />
      ) : (
        <div className="space-y-2">
          {filtered.map((inc) => (
            <div
              key={inc._id}
              className={`glass-card p-4 cursor-pointer transition-colors hover:border-accent-primary/30 ${inc.severity === 'critical' ? 'border-status-danger/40' : ''}`}
              onClick={() => navigate(`/emergency/${inc._id}`)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={inc.severity} />
                    <StatusBadge status={inc.status} />
                    <span className="font-mono text-xs text-text-muted">{inc.incidentId}</span>
                  </div>
                  <p className="text-sm font-medium text-text-primary line-clamp-2">{inc.description}</p>
                  <p className="text-xs text-text-muted mt-0.5">{inc.location} {inc.station ? `· ${inc.station.code}` : ''}</p>
                </div>
                <p className="text-xs font-mono text-text-muted flex-shrink-0">
                  {new Date(inc.reportedTime).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Report Incident" size="lg"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button form="incident-form" type="submit" disabled={isSubmitting} className="btn-danger">{isSubmitting ? 'Reporting...' : 'Report Incident'}</button>
          </>
        }
      >
        <form id="incident-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-muted mb-1">Incident Type *</label>
              <select {...register('type')} className="input-field">
                {['medical','equipment_failure','weather','navigation','supply_shortage','communication_loss','security','other'].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div><label className="block text-xs text-text-muted mb-1">Severity *</label>
              <select {...register('severity')} className="input-field">
                {['low','medium','high','critical'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-xs text-text-muted mb-1">Description *</label><textarea {...register('description')} className="input-field" rows={3} placeholder="Describe what happened..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-muted mb-1">Location *</label><input {...register('location')} className="input-field" placeholder="e.g. Maitri Station - Lab Block" /></div>
            <div><label className="block text-xs text-text-muted mb-1">Station</label>
              <select {...register('station')} className="input-field">
                <option value="">None</option>
                {stations.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
