import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wrench, Plus, Calendar } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';
import Modal from '../components/ui/Modal';
import { useForm } from 'react-hook-form';

interface Asset {
  _id: string;
  assetId: string;
  name: string;
  category: string;
  assignedStation?: { name: string; code: string };
  condition: string;
  status: string;
  acquisitionDate: string;
  maintenanceIntervalDays: number;
  lastMaintenanceDate?: string;
  nextMaintenanceDue?: string;
  usageHours: number;
  usageHoursThreshold: number;
  serialNumber?: string;
  notes?: string;
}

interface MaintenanceRecord {
  _id: string;
  type: string;
  description: string;
  performedBy?: string;
  maintenanceDate: string;
  nextScheduledDate?: string;
  cost?: number;
  recordedBy: { name: string };
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMaint, setShowMaint] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { type: 'scheduled', description: '', performedBy: '', maintenanceDate: new Date().toISOString().slice(0, 16), cost: '' },
  });

  const load = async () => {
    try {
      const [aRes, mRes] = await Promise.all([api.get(`/assets/${id}`), api.get(`/assets/${id}/maintenance`)]);
      setAsset(aRes.data.data);
      setRecords(mRes.data.data);
    } catch { setError('Asset not found.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const reportFault = async () => {
    try {
      await api.put(`/assets/${id}`, { status: 'fault_reported' });
      load();
    } catch (err: any) { setError(err?.response?.data?.error?.message || 'Failed'); }
  };

  const addMaintenance = async (data: any) => {
    try {
      await api.post(`/assets/${id}/maintenance`, { ...data, maintenanceDate: new Date(data.maintenanceDate).toISOString() });
      reset(); setShowMaint(false); load();
    } catch (err: any) { setError(err?.response?.data?.error?.message || 'Failed'); }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!asset) return <ErrorAlert message={error} onRetry={load} />;

  const daysUntilMaint = asset.nextMaintenanceDue
    ? Math.round((new Date(asset.nextMaintenanceDue).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="space-y-5 max-w-3xl">
      <button onClick={() => navigate('/assets')} className="flex items-center gap-2 text-text-muted hover:text-text-primary text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Assets
      </button>

      {error && <ErrorAlert message={error} />}

      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={asset.status} size="md" />
              <span className="text-xs text-text-muted capitalize">{asset.condition} condition</span>
            </div>
            <h1 className="text-xl font-bold text-text-primary">{asset.name}</h1>
            <p className="text-sm text-text-muted">{asset.category} · {asset.assignedStation?.name || 'Unassigned'}</p>
            <p className="text-xs font-mono text-text-muted mt-0.5">{asset.assetId} {asset.serialNumber ? `· S/N: ${asset.serialNumber}` : ''}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={reportFault} className="btn-secondary text-xs py-1.5 text-status-warning border-status-warning/30">Report Fault</button>
            <button onClick={() => setShowMaint(true)} className="btn-primary text-xs py-1.5">+ Maintenance Record</button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[rgba(148,163,184,0.1)]">
          <div>
            <p className="text-xs text-text-muted">Usage Hours</p>
            <p className="text-lg font-bold">{asset.usageHours} <span className="text-xs font-normal text-text-muted">/ {asset.usageHoursThreshold}</span></p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Acquisition Date</p>
            <p className="text-sm font-mono">{new Date(asset.acquisitionDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Last Maintenance</p>
            <p className="text-sm font-mono">{asset.lastMaintenanceDate ? new Date(asset.lastMaintenanceDate).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Next Maintenance</p>
            <p className={`text-sm font-mono ${daysUntilMaint !== null && daysUntilMaint <= 7 ? 'text-status-warning' : ''}`}>
              {asset.nextMaintenanceDue ? `${new Date(asset.nextMaintenanceDue).toLocaleDateString()} (${daysUntilMaint}d)` : '—'}
            </p>
          </div>
        </div>
        {asset.notes && <p className="mt-3 text-xs text-text-muted italic">{asset.notes}</p>}
      </div>

      <div className="glass-card p-5">
        <h2 className="section-header"><Calendar className="w-4 h-4 text-accent-primary" /> Maintenance History ({records.length})</h2>
        {records.length === 0 ? <p className="text-sm text-text-muted">No maintenance records</p> : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r._id} className="p-3 rounded-lg bg-white/5">
                <div className="flex items-center justify-between mb-1">
                  <StatusBadge status={r.type} />
                  <span className="font-mono text-xs text-text-muted">{new Date(r.maintenanceDate).toLocaleDateString()}</span>
                </div>
                <p className="text-sm">{r.description}</p>
                {r.performedBy && <p className="text-xs text-text-muted">By: {r.performedBy}</p>}
                {r.cost !== undefined && <p className="text-xs text-text-muted">Cost: ₹{r.cost}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showMaint} onClose={() => setShowMaint(false)} title="Add Maintenance Record"
        footer={
          <>
            <button onClick={() => setShowMaint(false)} className="btn-secondary">Cancel</button>
            <button form="maint-form" type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Adding...' : 'Add Record'}</button>
          </>
        }
      >
        <form id="maint-form" onSubmit={handleSubmit(addMaintenance)} className="space-y-3">
          <div><label className="block text-xs text-text-muted mb-1">Type *</label>
            <select {...register('type')} className="input-field">
              <option value="scheduled">Scheduled</option>
              <option value="corrective">Corrective</option>
              <option value="fault_report">Fault Report</option>
            </select>
          </div>
          <div><label className="block text-xs text-text-muted mb-1">Description *</label><textarea {...register('description')} className="input-field" rows={2} placeholder="What was done?" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs text-text-muted mb-1">Performed By</label><input {...register('performedBy')} className="input-field" /></div>
            <div><label className="block text-xs text-text-muted mb-1">Date *</label><input type="datetime-local" {...register('maintenanceDate')} className="input-field" /></div>
          </div>
          <div><label className="block text-xs text-text-muted mb-1">Cost (₹)</label><input type="number" {...register('cost')} className="input-field" /></div>
        </form>
      </Modal>
    </div>
  );
}
