import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Map, Search, Filter } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import ErrorAlert from '../components/ui/ErrorAlert';
import Modal from '../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const expeditionFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  missionType: z.enum(['scientific', 'resupply', 'maintenance', 'emergency', 'survey']),
  destination: z.string().min(1, 'Destination required'),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().min(1, 'End date required'),
  description: z.string().optional(),
  planningProgress: z.number().min(0).max(100).optional(),
});
type ExpeditionForm = z.infer<typeof expeditionFormSchema>;

interface Expedition {
  _id: string;
  name: string;
  missionType: string;
  destination: { name: string; code: string };
  startDate: string;
  endDate: string;
  status: string;
  planningProgress: number;
}

export default function ExpeditionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [expeditions, setExpeditions] = useState<Expedition[]>([]);
  const [stations, setStations] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ExpeditionForm>({
    resolver: zodResolver(expeditionFormSchema),
  });

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const [expRes, stationRes] = await Promise.all([
        api.get(`/expeditions?${params}`),
        api.get('/stations'),
      ]);
      setExpeditions(expRes.data.data);
      setStations(stationRes.data.data);
    } catch {
      setError('Failed to load expeditions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const onSubmit = async (data: ExpeditionForm) => {
    try {
      await api.post('/expeditions', {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      });
      reset();
      setShowCreate(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to create expedition');
    }
  };

  const filtered = expeditions.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.destination?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Map className="w-5 h-5 text-accent-primary" />
        <h1 className="text-xl font-bold text-text-primary">Expeditions</h1>
        <span className="ml-auto flex items-center gap-2">
          <button id="create-expedition-btn" onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Expedition
          </button>
        </span>
      </div>

      {error && <ErrorAlert message={error} onRetry={load} />}

      {/* Filters */}
      <div className="glass-card p-3 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input className="input-field pl-9 py-1.5 text-xs" placeholder="Search expeditions..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <select className="input-field py-1.5 text-xs w-36" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['draft', 'planned', 'active', 'completed', 'cancelled'].map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? <LoadingSpinner fullPage text="Loading expeditions..." /> : (
        filtered.length === 0 ? (
          <EmptyState icon={Map} title="No expeditions found" description="Create your first expedition to get started" action={{ label: 'New Expedition', onClick: () => setShowCreate(true) }} />
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Mission Type</th>
                  <th>Station</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp) => (
                  <tr
                    key={exp._id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/expeditions/${exp._id}`)}
                  >
                    <td className="font-medium">{exp.name}</td>
                    <td className="capitalize text-text-muted">{exp.missionType}</td>
                    <td>
                      <span className="font-mono text-xs">{exp.destination?.code}</span>
                      <span className="text-text-muted ml-1 text-xs">{exp.destination?.name}</span>
                    </td>
                    <td className="font-mono text-xs text-text-muted">{new Date(exp.startDate).toLocaleDateString()}</td>
                    <td className="font-mono text-xs text-text-muted">{new Date(exp.endDate).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden w-20">
                          <div className="h-full bg-accent-primary rounded-full" style={{ width: `${exp.planningProgress}%` }} />
                        </div>
                        <span className="text-xs text-text-muted">{exp.planningProgress}%</span>
                      </div>
                    </td>
                    <td><StatusBadge status={exp.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Expedition" size="lg"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button form="expedition-form" type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Creating...' : 'Create Expedition'}
            </button>
          </>
        }
      >
        <form id="expedition-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1">Name *</label>
            <input {...register('name')} className="input-field" placeholder="POLAR-2026-XX: Description" />
            {errors.name && <p className="text-xs text-status-danger mt-1">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Mission Type *</label>
              <select {...register('missionType')} className="input-field">
                <option value="">Select type</option>
                {['scientific', 'resupply', 'maintenance', 'emergency', 'survey'].map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
              {errors.missionType && <p className="text-xs text-status-danger mt-1">{errors.missionType.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Destination Station *</label>
              <select {...register('destination')} className="input-field">
                <option value="">Select station</option>
                {stations.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
              </select>
              {errors.destination && <p className="text-xs text-status-danger mt-1">{errors.destination.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Start Date *</label>
              <input type="datetime-local" {...register('startDate')} className="input-field" />
              {errors.startDate && <p className="text-xs text-status-danger mt-1">{errors.startDate.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">End Date *</label>
              <input type="datetime-local" {...register('endDate')} className="input-field" />
              {errors.endDate && <p className="text-xs text-status-danger mt-1">{errors.endDate.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Description</label>
            <textarea {...register('description')} className="input-field" rows={3} placeholder="Mission objectives..." />
          </div>
        </form>
      </Modal>
    </div>
  );
}
