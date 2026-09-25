import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, AlertTriangle, TrendingDown, Info } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts';
import api from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { useSyncStore } from '../store/syncStore';
import { v4 as uuidv4 } from 'uuid';

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
  description?: string;
}

interface Transaction {
  _id: string;
  type: string;
  quantity: number;
  reason: string;
  performedBy: { name: string };
  createdAt: string;
}

interface ForecastResult {
  estimatedDailyUsage: number;
  estimatedDaysRemaining: number | null;
  estimatedDepletionDate: string | null;
  confidence: string;
  availableQuantity: number;
  threshold: number;
  unit: string;
  historicalData: Array<{ date: string; consumption: number }>;
  explanation: { formula: string; inputs: Record<string, unknown> };
}

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTxModal, setShowTxModal] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const { isOnline, addToQueue } = useSyncStore();

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { type: 'consumption', quantity: 1, reason: '' },
  });

  const load = async () => {
    try {
      const [itemRes, txRes, forecastRes] = await Promise.all([
        api.get(`/inventory/${id}`),
        api.get(`/inventory/transactions?item=${id}&limit=30`),
        api.get(`/inventory/forecast/${id}`),
      ]);
      setItem(itemRes.data.data);
      setTransactions(txRes.data.data);
      setForecast(forecastRes.data.data);
    } catch { setError('Item not found.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const recordTransaction = async (data: any) => {
    const idempotencyKey = uuidv4();
    if (!isOnline) {
      addToQueue({ id: idempotencyKey, action: 'inventory_transaction', data: { ...data, item: id, idempotencyKey }, status: 'pending', idempotencyKey, timestamp: new Date().toISOString() });
      setShowTxModal(false);
      reset();
      return;
    }
    try {
      await api.post('/inventory/transactions', { ...data, item: id, idempotencyKey });
      reset(); setShowTxModal(false); load();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Transaction failed');
    }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (error || !item) return <ErrorAlert message={error || 'Not found'} onRetry={load} />;

  const isLow = item.onHandQuantity < item.minThreshold;
  const confidenceColor = forecast?.confidence === 'high' ? 'text-status-success' : forecast?.confidence === 'medium' ? 'text-status-warning' : 'text-status-danger';

  // Chart data: historical + projected
  const chartData: { date: string; actual: number | null; forecast: number | null }[] = (forecast?.historicalData || []).map((d) => ({
    date: d.date.slice(5),
    actual: d.consumption,
    forecast: null,
  }));
  if (forecast?.estimatedDailyUsage && forecast.estimatedDailyUsage > 0) {
    for (let i = 1; i <= 14; i++) {
      const dt = new Date(); dt.setDate(dt.getDate() + i);
      chartData.push({ date: `+${i}d`, actual: 0, forecast: Math.round(forecast.estimatedDailyUsage * 10) / 10 });
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <button onClick={() => navigate('/inventory')} className="flex items-center gap-2 text-text-muted hover:text-text-primary text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Inventory
      </button>

      {error && <ErrorAlert message={error} />}

      {/* Item header */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={item.category} />
              {isLow && <span className="flex items-center gap-1 text-xs text-status-warning"><AlertTriangle className="w-3.5 h-3.5" /> Below threshold</span>}
            </div>
            <h1 className="text-xl font-bold text-text-primary">{item.name}</h1>
            <p className="text-sm text-text-muted">{item.station?.name} ({item.station?.code})</p>
          </div>
          <button onClick={() => setShowTxModal(true)} className="btn-primary flex items-center gap-2" id="record-transaction-btn">
            Record Transaction
            {!isOnline && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1 rounded">offline</span>}
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-5 pt-4 border-t border-[rgba(148,163,184,0.1)]">
          <div>
            <p className="text-xs text-text-muted">On Hand</p>
            <p className="text-xl font-bold">{item.onHandQuantity} <span className="text-sm font-normal text-text-muted">{item.unit}</span></p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Reserved</p>
            <p className="text-xl font-bold text-text-muted">{item.reservedQuantity}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Available</p>
            <p className={`text-xl font-bold ${isLow ? 'text-status-danger' : 'text-status-success'}`}>
              {item.onHandQuantity - item.reservedQuantity}
            </p>
            <p className="text-[9px] text-text-muted">= on-hand − reserved</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Min Threshold</p>
            <p className="text-xl font-bold text-status-warning">{item.minThreshold}</p>
          </div>
        </div>
      </div>

      {/* Forecast */}
      {forecast && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-header mb-0"><Brain className="w-4 h-4 text-accent-primary" /> Depletion Forecast</h2>
            <button onClick={() => setShowExplanation(true)} className="flex items-center gap-1 text-xs text-text-muted hover:text-accent-primary">
              <Info className="w-3.5 h-3.5" /> How is this calculated?
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-5">
            <div>
              <p className="text-xs text-text-muted">Est. Daily Usage</p>
              <p className="text-lg font-bold">{forecast.estimatedDailyUsage.toFixed(2)} <span className="text-sm font-normal text-text-muted">{item.unit}/day</span></p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Days Remaining</p>
              <p className={`text-lg font-bold ${forecast.estimatedDaysRemaining !== null && forecast.estimatedDaysRemaining < 14 ? 'text-status-danger' : 'text-text-primary'}`}>
                {forecast.estimatedDaysRemaining !== null ? `~${Math.round(forecast.estimatedDaysRemaining)}` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Confidence</p>
              <p className={`text-sm font-semibold ${confidenceColor} capitalize`}>{forecast.confidence}</p>
              {forecast.confidence === 'insufficient_data' && (
                <p className="text-[10px] text-text-muted">Need more usage history</p>
              )}
            </div>
          </div>

          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip contentStyle={{ background: '#13263A', border: '1px solid rgba(72,202,228,0.2)', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="actual" stroke="#48CAE4" strokeWidth={2} dot={false} name="Actual consumption" />
                <Line type="monotone" dataKey="forecast" stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="4 4" name="Forecast" />
                <ReferenceLine y={item.minThreshold} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Threshold', fill: '#EF4444', fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Transaction history */}
      <div className="glass-card p-5">
        <h2 className="section-header"><TrendingDown className="w-4 h-4 text-accent-primary" /> Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-text-muted">No transactions recorded yet</p>
        ) : (
          <table className="w-full data-table">
            <thead><tr><th>Date</th><th>Type</th><th>Quantity</th><th>Reason</th><th>By</th></tr></thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx._id}>
                  <td className="font-mono text-xs">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  <td><StatusBadge status={tx.type} /></td>
                  <td className={`font-mono text-sm font-bold ${tx.quantity < 0 ? 'text-status-danger' : 'text-status-success'}`}>
                    {tx.quantity > 0 ? '+' : ''}{tx.quantity} {item.unit}
                  </td>
                  <td className="text-text-muted text-xs">{tx.reason}</td>
                  <td className="text-text-muted text-xs">{tx.performedBy?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Transaction modal */}
      <Modal isOpen={showTxModal} onClose={() => setShowTxModal(false)} title="Record Inventory Transaction"
        footer={
          <>
            <button onClick={() => setShowTxModal(false)} className="btn-secondary">Cancel</button>
            <button form="tx-form" type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Recording...' : 'Record'}
            </button>
          </>
        }
      >
        {!isOnline && (
          <div className="mb-3 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
            You're offline. This transaction will be queued and synced when you reconnect.
          </div>
        )}
        <form id="tx-form" onSubmit={handleSubmit(recordTransaction)} className="space-y-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Transaction Type *</label>
            <select {...register('type')} className="input-field">
              <option value="consumption">Consumption</option>
              <option value="receipt">Receipt</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Quantity *</label>
            <input type="number" step="0.1" {...register('quantity', { valueAsNumber: true })} className="input-field" />
            <p className="text-[10px] text-text-muted mt-0.5">Positive for receipt/adjustment-in, negative for consumption will be computed server-side.</p>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Reason *</label>
            <input {...register('reason')} className="input-field" placeholder="e.g. Daily operations" />
          </div>
        </form>
      </Modal>

      {/* Explanation modal */}
      <Modal isOpen={showExplanation} onClose={() => setShowExplanation(false)} title="Forecast Explanation" size="lg">
        <div className="space-y-4 text-sm">
          <div className="p-3 rounded-lg bg-white/5 font-mono text-xs text-accent-secondary whitespace-pre-wrap">
            {forecast?.explanation.formula}
          </div>
          <div>
            <p className="text-xs text-text-muted mb-2 font-semibold">Inputs used:</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(forecast?.explanation.inputs || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between p-2 rounded bg-white/5 text-xs">
                  <span className="text-text-muted">{k}</span>
                  <span className="font-mono font-bold">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-text-muted italic">Confidence is High if ≥7 days of history, Medium if ≥3 days, Low if fewer, Insufficient if none.</p>
        </div>
      </Modal>
    </div>
  );
}
