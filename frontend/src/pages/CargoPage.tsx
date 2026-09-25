import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Plus, Search, Filter, Truck } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import ErrorAlert from '../components/ui/ErrorAlert';
import Modal from '../components/ui/Modal';
import { useForm, useFieldArray } from 'react-hook-form';

interface Shipment {
  _id: string;
  shipmentId: string;
  origin: { name: string; code: string };
  destination: { name: string; code: string };
  estimatedArrival: string;
  status: string;
  cargoItems: Array<{ name: string; quantity: number; unit: string }>;
}

export default function CargoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stations, setStations] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState('');

  const { register, handleSubmit, control, reset, formState: { isSubmitting } } = useForm({
    defaultValues: {
      origin: '', destination: '', estimatedArrival: '',
      notes: '',
      cargoItems: [{ name: '', category: 'food', quantity: 1, unit: 'kg' }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'cargoItems' });

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const [shipRes, stationRes] = await Promise.all([
        api.get(`/shipments?${params}`),
        api.get('/stations'),
      ]);
      setShipments(shipRes.data.data);
      setStations(stationRes.data.data);
    } catch { setError('Failed to load shipments.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/shipments', { ...data, estimatedArrival: new Date(data.estimatedArrival).toISOString() });
      reset(); setShowCreate(false); load();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to create shipment');
    }
  };

  const filtered = shipments.filter((s) =>
    s.shipmentId.toLowerCase().includes(search.toLowerCase()) ||
    s.origin?.code?.toLowerCase().includes(search.toLowerCase()) ||
    s.destination?.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Package className="w-5 h-5 text-accent-primary" />
        <h1 className="text-xl font-bold text-text-primary">Cargo & Shipments</h1>
        <button id="create-shipment-btn" onClick={() => setShowCreate(true)} className="btn-primary ml-auto flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Shipment
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={load} />}

      <div className="glass-card p-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input className="input-field pl-9 py-1.5 text-xs" placeholder="Search by ID or station code..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field py-1.5 text-xs w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['created','prepared','dispatched','in_transit','delayed','arrived','received','cancelled'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? <LoadingSpinner fullPage /> : (
        filtered.length === 0 ? (
          <EmptyState icon={Truck} title="No shipments found" action={{ label: 'New Shipment', onClick: () => setShowCreate(true) }} />
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Shipment ID</th>
                  <th>Origin → Destination</th>
                  <th>Cargo Items</th>
                  <th>ETA</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s._id} className="cursor-pointer" onClick={() => navigate(`/cargo/${s._id}`)}>
                    <td className="font-mono text-xs text-accent-primary">{s.shipmentId}</td>
                    <td>
                      <span className="font-mono text-xs">{s.origin?.code}</span>
                      <span className="text-text-muted mx-1">→</span>
                      <span className="font-mono text-xs">{s.destination?.code}</span>
                    </td>
                    <td className="text-xs text-text-muted">{s.cargoItems?.length} item(s)</td>
                    <td className="font-mono text-xs text-text-muted">
                      {new Date(s.estimatedArrival).toLocaleDateString()}
                      <span className="simulated-badge ml-1">Simulated</span>
                    </td>
                    <td><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Shipment" size="xl"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button form="shipment-form" type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Creating...' : 'Create Shipment'}
            </button>
          </>
        }
      >
        <form id="shipment-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Origin *</label>
              <select {...register('origin')} className="input-field">
                <option value="">Select origin</option>
                {stations.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Destination *</label>
              <select {...register('destination')} className="input-field">
                <option value="">Select destination</option>
                {stations.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Estimated Arrival *</label>
            <input type="datetime-local" {...register('estimatedArrival')} className="input-field" />
          </div>
          {/* Cargo items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-text-muted">Cargo Items *</label>
              <button type="button" onClick={() => append({ name: '', category: 'food', quantity: 1, unit: 'kg' })} className="text-xs text-accent-primary hover:text-accent-secondary">+ Add item</button>
            </div>
            <div className="space-y-2">
              {fields.map((field, i) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <input {...register(`cargoItems.${i}.name`)} className="input-field flex-1" placeholder="Item name" />
                  <select {...register(`cargoItems.${i}.category`)} className="input-field w-32">
                    {['food','fuel','medical','research_equipment','spare_parts','protective_equipment','communication_supplies','other'].map((c) => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <input type="number" {...register(`cargoItems.${i}.quantity`, { valueAsNumber: true })} className="input-field w-20" placeholder="Qty" />
                  <input {...register(`cargoItems.${i}.unit`)} className="input-field w-16" placeholder="unit" />
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(i)} className="text-status-danger text-xs p-2">✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Notes</label>
            <textarea {...register('notes')} className="input-field" rows={2} placeholder="Optional notes..." />
          </div>
        </form>
      </Modal>
    </div>
  );
}
