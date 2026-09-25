import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Archive, Plus, Search, AlertTriangle, TrendingDown } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import ErrorAlert from '../components/ui/ErrorAlert';
import Modal from '../components/ui/Modal';
import { useForm } from 'react-hook-form';

interface InventoryItem {
  _id: string;
  name: string;
  category: string;
  station: { name: string; code: string };
  onHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  unit: string;
  minThreshold: number;
}

export default function InventoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stations, setStations] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [search, setSearch] = useState('');

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { name: '', category: 'food', station: '', onHandQuantity: 0, unit: '', minThreshold: 0, description: '' },
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set('category', categoryFilter);
      if (lowStockOnly) params.set('lowStock', 'true');
      const [invRes, stationRes] = await Promise.all([
        api.get(`/inventory?${params}&limit=100`),
        api.get('/stations'),
      ]);
      setItems(invRes.data.data);
      setStations(stationRes.data.data);
    } catch { setError('Failed to load inventory.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [categoryFilter, lowStockOnly]);

  const onSubmit = async (data: any) => {
    try {
      await api.post('/inventory', data);
      reset(); setShowCreate(false); load();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to create item');
    }
  };

  const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Archive className="w-5 h-5 text-accent-primary" />
        <h1 className="text-xl font-bold text-text-primary">Inventory Management</h1>
        <button id="create-inventory-btn" onClick={() => setShowCreate(true)} className="btn-primary ml-auto flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {error && <ErrorAlert message={error} onRetry={load} />}

      <div className="glass-card p-3 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input className="input-field pl-9 py-1.5 text-xs" placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-field py-1.5 text-xs w-44" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {['food','fuel','medical','research_equipment','spare_parts','protective_equipment','communication_supplies','other'].map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} className="rounded" />
          Low stock only
        </label>
      </div>

      {loading ? <LoadingSpinner fullPage /> : (
        filtered.length === 0 ? (
          <EmptyState icon={Archive} title="No inventory items found" action={{ label: 'Add Item', onClick: () => setShowCreate(true) }} />
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Station</th>
                  <th>On Hand</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Min Threshold</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const isLow = item.onHandQuantity < item.minThreshold;
                  return (
                    <tr key={item._id} className="cursor-pointer" onClick={() => navigate(`/inventory/${item._id}`)}>
                      <td className="font-medium">
                        {item.name}
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-status-warning inline ml-2" />}
                      </td>
                      <td><StatusBadge status={item.category} /></td>
                      <td className="font-mono text-xs">{item.station?.code}</td>
                      <td className="font-mono text-sm">{item.onHandQuantity} <span className="text-text-muted text-xs">{item.unit}</span></td>
                      <td className="font-mono text-sm text-text-muted">{item.reservedQuantity}</td>
                      <td className={`font-mono text-sm font-bold ${isLow ? 'text-status-danger' : 'text-status-success'}`}>
                        {(item.onHandQuantity - item.reservedQuantity)}
                      </td>
                      <td className="font-mono text-xs text-text-muted">{item.minThreshold} {item.unit}</td>
                      <td>
                        {isLow && (
                          <span className="inline-flex items-center gap-1 text-xs text-status-warning">
                            <TrendingDown className="w-3 h-3" /> Low
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Inventory Item" size="md"
        footer={
          <>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button form="inv-form" type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Adding...' : 'Add Item'}
            </button>
          </>
        }
      >
        <form id="inv-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Item Name *</label>
            <input {...register('name')} className="input-field" placeholder="e.g. Freeze-dried rations" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Category *</label>
              <select {...register('category')} className="input-field">
                {['food','fuel','medical','research_equipment','spare_parts','protective_equipment','communication_supplies','other'].map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Station *</label>
              <select {...register('station')} className="input-field">
                <option value="">Select</option>
                {stations.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">On Hand *</label>
              <input type="number" {...register('onHandQuantity', { valueAsNumber: true })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Unit *</label>
              <input {...register('unit')} className="input-field" placeholder="kg / units..." />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Min Threshold *</label>
              <input type="number" {...register('minThreshold', { valueAsNumber: true })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Description</label>
            <textarea {...register('description')} className="input-field" rows={2} />
          </div>
        </form>
      </Modal>
    </div>
  );
}
