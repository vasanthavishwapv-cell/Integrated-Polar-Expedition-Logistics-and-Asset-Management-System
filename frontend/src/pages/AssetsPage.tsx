import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Plus, Search, AlertTriangle } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import ErrorAlert from '../components/ui/ErrorAlert';
import Modal from '../components/ui/Modal';
import { useForm } from 'react-hook-form';

interface Asset {
  _id: string;
  assetId: string;
  name: string;
  category: string;
  assignedStation: { name: string; code: string };
  status: string;
  condition: string;
  nextMaintenanceDue?: string;
}

export default function AssetsPage() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [stations, setStations] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: '', category: '', condition: 'good', acquisitionDate: '',
      maintenanceIntervalDays: 90, usageHoursThreshold: 1000, assignedStation: '', serialNumber: '',
    },
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const [aRes, sRes] = await Promise.all([api.get(`/assets${params}`), api.get('/stations')]);
      setAssets(aRes.data.data);
      setStations(sRes.data.data);
    } catch { setError('Failed to load assets.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/assets', { ...data, acquisitionDate: new Date(data.acquisitionDate).toISOString() });
      reset(); setShowCreate(false); load();
    } catch (err: any) { setError(err?.response?.data?.error?.message || 'Failed to create'); }
  };

  const filtered = assets.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  );

  const isMaintenanceDue = (asset: Asset) => {
    if (!asset.nextMaintenanceDue) return false;
    const daysUntil = Math.round((new Date(asset.nextMaintenanceDue).getTime() - Date.now()) / 86400000);
    return daysUntil <= 7;
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Wrench className="w-5 h-5 text-accent-primary" />
        <h1 className="text-xl font-bold text-text-primary">Asset & Equipment</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary ml-auto flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Register Asset
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={load} />}

      <div className="glass-card p-3 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input className="input-field pl-9 py-1.5 text-xs" placeholder="Search by name or category..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field py-1.5 text-xs w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['operational','under_maintenance','fault_reported','out_of_service','retired'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? <LoadingSpinner fullPage /> : filtered.length === 0 ? (
        <EmptyState icon={Wrench} title="No assets found" action={{ label: 'Register Asset', onClick: () => setShowCreate(true) }} />
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full data-table">
            <thead><tr><th>Asset ID</th><th>Name</th><th>Category</th><th>Station</th><th>Condition</th><th>Next Maintenance</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a._id} className="cursor-pointer" onClick={() => navigate(`/assets/${a._id}`)}>
                  <td className="font-mono text-xs text-accent-primary">{a.assetId}</td>
                  <td className="font-medium">
                    {a.name}
                    {isMaintenanceDue(a) && <AlertTriangle className="w-3.5 h-3.5 text-status-warning inline ml-2" />}
                  </td>
                  <td className="text-text-muted text-xs">{a.category}</td>
                  <td className="font-mono text-xs">{a.assignedStation?.code || '—'}</td>
                  <td className="capitalize text-xs">{a.condition}</td>
                  <td className="font-mono text-xs text-text-muted">
                    {a.nextMaintenanceDue ? new Date(a.nextMaintenanceDue).toLocaleDateString() : '—'}
                  </td>
                  <td><StatusBadge status={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Register Asset" size="lg"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button form="asset-form" type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Registering...' : 'Register'}</button>
          </>
        }
      >
        <form id="asset-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-muted mb-1">Name *</label><input {...register('name')} className="input-field" /></div>
            <div><label className="block text-xs text-text-muted mb-1">Category *</label><input {...register('category')} className="input-field" placeholder="Vehicle, Power System..." /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-muted mb-1">Condition *</label>
              <select {...register('condition')} className="input-field">
                {['excellent','good','fair','poor'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-text-muted mb-1">Acquisition Date *</label><input type="date" {...register('acquisitionDate')} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-muted mb-1">Maintenance Interval (days)</label><input type="number" {...register('maintenanceIntervalDays', { valueAsNumber: true })} className="input-field" /></div>
            <div><label className="block text-xs text-text-muted mb-1">Usage Hours Threshold</label><input type="number" {...register('usageHoursThreshold', { valueAsNumber: true })} className="input-field" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-muted mb-1">Assigned Station</label>
              <select {...register('assignedStation')} className="input-field">
                <option value="">None</option>
                {stations.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="block text-xs text-text-muted mb-1">Serial Number</label><input {...register('serialNumber')} className="input-field" /></div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
