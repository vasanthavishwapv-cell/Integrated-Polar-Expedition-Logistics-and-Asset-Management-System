import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, Search } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import ErrorAlert from '../components/ui/ErrorAlert';
import Modal from '../components/ui/Modal';
import { useForm } from 'react-hook-form';

interface Personnel {
  _id: string;
  personnelId: string;
  name: string;
  role: string;
  department: string;
  assignedStation: { name: string; code: string };
  currentStatus: string;
}

export default function PersonnelPage() {
  const navigate = useNavigate();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [stations, setStations] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { name: '', role: '', department: '', email: '', assignedStation: '' },
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?currentStatus=${statusFilter}` : '';
      const [pRes, sRes] = await Promise.all([api.get(`/personnel${params}`), api.get('/stations')]);
      setPersonnel(pRes.data.data);
      setStations(sRes.data.data);
    } catch { setError('Failed to load personnel.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/personnel', data);
      reset(); setShowCreate(false); load();
    } catch (err: any) { setError(err?.response?.data?.error?.message || 'Failed to create'); }
  };

  const filtered = personnel.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.role.toLowerCase().includes(search.toLowerCase()) ||
    p.department.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Users className="w-5 h-5 text-accent-primary" />
        <h1 className="text-xl font-bold text-text-primary">Personnel Management</h1>
        <p className="text-xs text-text-muted ml-1">Movement records are self-reported check-in/check-out events, not live GPS</p>
        <button onClick={() => setShowCreate(true)} className="btn-primary ml-auto flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Personnel
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={load} />}

      <div className="glass-card p-3 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input className="input-field pl-9 py-1.5 text-xs" placeholder="Search by name, role, department..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field py-1.5 text-xs w-48" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['assigned','preparing','in_transit','at_station','on_assignment','returned','status_verification_required'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? <LoadingSpinner fullPage /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No personnel found" action={{ label: 'Add Personnel', onClick: () => setShowCreate(true) }} />
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full data-table">
            <thead><tr><th>ID</th><th>Name</th><th>Role / Dept</th><th>Station</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p._id} className="cursor-pointer" onClick={() => navigate(`/personnel/${p._id}`)}>
                  <td className="font-mono text-xs text-accent-primary">{p.personnelId}</td>
                  <td className="font-medium">{p.name}</td>
                  <td>
                    <p className="text-sm">{p.role}</p>
                    <p className="text-xs text-text-muted">{p.department}</p>
                  </td>
                  <td className="font-mono text-xs">{p.assignedStation?.code || '—'}</td>
                  <td><StatusBadge status={p.currentStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Personnel"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button form="personnel-form" type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Adding...' : 'Add'}</button>
          </>
        }
      >
        <form id="personnel-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div><label className="block text-xs text-text-muted mb-1">Full Name *</label><input {...register('name')} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-muted mb-1">Role *</label><input {...register('role')} className="input-field" placeholder="e.g. Glaciologist" /></div>
            <div><label className="block text-xs text-text-muted mb-1">Department *</label><input {...register('department')} className="input-field" placeholder="Scientific" /></div>
          </div>
          <div><label className="block text-xs text-text-muted mb-1">Email *</label><input type="email" {...register('email')} className="input-field" /></div>
          <div><label className="block text-xs text-text-muted mb-1">Station</label>
            <select {...register('assignedStation')} className="input-field">
              <option value="">None</option>
              {stations.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
