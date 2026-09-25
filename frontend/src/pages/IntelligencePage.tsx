import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Archive, Bell, TrendingUp, Info, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import api from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';

interface ForecastSummary {
  itemId: string;
  itemName: string;
  unit: string;
  estimatedDailyUsage: number;
  estimatedDaysRemaining: number | null;
  confidence: string;
  availableQuantity: number;
  threshold: number;
  historicalData: Array<{ date: string; consumption: number }>;
  explanation: { formula: string; inputs: Record<string, unknown> };
}

interface Alert {
  _id: string;
  type: string;
  severity: string;
  reason: string;
  entityType: string;
  status: string;
  explanation: { rule: string; inputs: Record<string, unknown> };
  createdAt: string;
}

export default function IntelligencePage() {
  const navigate = useNavigate();
  const [forecasts, setForecasts] = useState<ForecastSummary[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedForecast, setSelectedForecast] = useState<ForecastSummary | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [runningEngine, setRunningEngine] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [invRes, alertRes] = await Promise.all([
        api.get('/inventory?limit=100'),
        api.get('/alerts?status=open&limit=50'),
      ]);
      const items: Array<{ _id: string; name: string; unit: string }> = invRes.data.data;

      // Fetch forecasts for top 6 items (limited for perf)
      const top6 = items.slice(0, 6);
      const forecastResults = await Promise.allSettled(
        top6.map(async (item) => {
          const res = await api.get(`/inventory/forecast/${item._id}`);
          return { ...res.data.data, itemName: item.name };
        })
      );
      setForecasts(
        forecastResults
          .filter((r): r is PromiseFulfilledResult<ForecastSummary> => r.status === 'fulfilled')
          .map((r) => r.value)
      );
      setAlerts(alertRes.data.data);
    } catch { setError('Failed to load intelligence data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const acknowledgeAlert = async (alertId: string, notes = '') => {
    setAcknowledging(true);
    try {
      await api.put(`/alerts/${alertId}/acknowledge`, { notes });
      setSelectedAlert(null);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Acknowledge failed');
    } finally { setAcknowledging(false); }
  };

  const runEngine = async () => {
    setRunningEngine(true);
    try {
      await api.post('/alerts/run-engine');
      load();
    } catch {} finally { setRunningEngine(false); }
  };

  const confidenceColor = (c: string) =>
    c === 'high' ? 'text-status-success' : c === 'medium' ? 'text-status-warning' : c === 'insufficient_data' ? 'text-text-muted' : 'text-status-danger';

  if (loading) return <LoadingSpinner fullPage text="Computing intelligence..." />;
  if (error) return <ErrorAlert message={error} onRetry={load} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="w-5 h-5 text-accent-primary" />
        <h1 className="text-xl font-bold text-text-primary">Intelligence Center</h1>
        <span className="text-xs text-text-muted">Decision-support layer — all outputs are explainable</span>
        <button onClick={runEngine} disabled={runningEngine} className="btn-secondary ml-auto flex items-center gap-2 text-xs py-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${runningEngine ? 'animate-spin' : ''}`} />
          {runningEngine ? 'Running...' : 'Run Alert Engine'}
        </button>
      </div>

      {/* Forecasts */}
      <div>
        <h2 className="section-header"><Archive className="w-4 h-4 text-accent-primary" /> Inventory Depletion Forecasts</h2>
        <p className="text-xs text-text-muted mb-4">Based on N-day trailing moving average. Click any item for full chart and formula.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forecasts.map((f) => (
            <div
              key={f.itemId}
              className="glass-card p-4 cursor-pointer hover:border-accent-primary/30 transition-colors"
              onClick={() => setSelectedForecast(f)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">{f.itemName}</p>
                  <p className="text-xs text-text-muted">{f.availableQuantity} {f.unit} available</p>
                </div>
                <span className={`text-xs font-medium capitalize ${confidenceColor(f.confidence)}`}>{f.confidence}</span>
              </div>
              <div className="flex gap-4 text-xs">
                <div>
                  <p className="text-text-muted">Daily usage</p>
                  <p className="font-mono font-bold">{f.estimatedDailyUsage.toFixed(2)} {f.unit}</p>
                </div>
                <div>
                  <p className="text-text-muted">Days left</p>
                  <p className={`font-mono font-bold ${f.estimatedDaysRemaining !== null && f.estimatedDaysRemaining < 14 ? 'text-status-danger' : ''}`}>
                    {f.estimatedDaysRemaining !== null ? `~${Math.round(f.estimatedDaysRemaining)}` : 'N/A'}
                  </p>
                </div>
              </div>
              {f.historicalData.length > 0 && (
                <div className="mt-3 -mx-1">
                  <ResponsiveContainer width="100%" height={50}>
                    <LineChart data={f.historicalData.slice(-14)}>
                      <Line type="monotone" dataKey="consumption" stroke="#48CAE4" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="mt-2 flex items-center gap-1 text-[10px] text-text-muted">
                <Info className="w-3 h-3" /> Click to see formula
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/inventory')} className="mt-3 text-xs text-accent-primary hover:text-accent-secondary">View all inventory items →</button>
      </div>

      {/* Alerts */}
      <div>
        <h2 className="section-header"><Bell className="w-4 h-4 text-status-danger" /> Open Operational Alerts ({alerts.length})</h2>
        {alerts.length === 0 ? (
          <div className="glass-card p-8 text-center text-sm text-status-success">✓ No open alerts — all systems nominal</div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert._id}
                className="glass-card p-4 cursor-pointer hover:border-accent-primary/30"
                onClick={() => setSelectedAlert(alert)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={alert.severity} />
                      <span className="text-xs text-text-muted capitalize">{alert.type.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-sm text-text-primary">{alert.reason}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-mono text-text-muted">{new Date(alert.createdAt).toLocaleDateString()}</p>
                    <button
                      className="mt-1 text-xs text-accent-primary hover:text-accent-secondary"
                      onClick={(e) => { e.stopPropagation(); acknowledgeAlert(alert._id); }}
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Forecast detail modal */}
      {selectedForecast && (
        <Modal isOpen={!!selectedForecast} onClose={() => setSelectedForecast(null)} title={`Forecast: ${selectedForecast.itemName}`} size="xl">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <p className="text-xs text-text-muted">Daily Usage</p>
                <p className="text-lg font-bold">{selectedForecast.estimatedDailyUsage.toFixed(2)}</p>
                <p className="text-xs text-text-muted">{selectedForecast.unit}/day</p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <p className="text-xs text-text-muted">Days Remaining</p>
                <p className={`text-lg font-bold ${selectedForecast.estimatedDaysRemaining !== null && selectedForecast.estimatedDaysRemaining < 14 ? 'text-status-danger' : ''}`}>
                  {selectedForecast.estimatedDaysRemaining !== null ? `~${Math.round(selectedForecast.estimatedDaysRemaining)}` : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-white/5 text-center">
                <p className="text-xs text-text-muted">Confidence</p>
                <p className={`text-lg font-bold capitalize ${confidenceColor(selectedForecast.confidence)}`}>{selectedForecast.confidence}</p>
              </div>
            </div>
            {selectedForecast.historicalData.length > 0 && (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={selectedForecast.historicalData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94A3B8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <Tooltip contentStyle={{ background: '#13263A', fontSize: 11 }} />
                  <Line type="monotone" dataKey="consumption" stroke="#48CAE4" strokeWidth={2} dot={false} name="Consumption" />
                  <ReferenceLine y={selectedForecast.threshold} stroke="#EF4444" strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
            )}
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-text-muted mb-2 font-semibold">Formula</p>
              <code className="text-xs text-accent-secondary whitespace-pre-wrap">{selectedForecast.explanation.formula}</code>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(selectedForecast.explanation.inputs).map(([k, v]) => (
                <div key={k} className="flex justify-between p-2 rounded bg-white/5 text-xs">
                  <span className="text-text-muted">{k}</span>
                  <span className="font-mono">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Alert detail modal */}
      {selectedAlert && (
        <Modal isOpen={!!selectedAlert} onClose={() => setSelectedAlert(null)} title="Alert Details"
          footer={
            <>
              <button onClick={() => setSelectedAlert(null)} className="btn-secondary">Close</button>
              <button onClick={() => acknowledgeAlert(selectedAlert._id)} disabled={acknowledging} className="btn-primary">
                {acknowledging ? 'Acknowledging...' : 'Acknowledge Alert'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={selectedAlert.severity} size="md" />
              <span className="text-sm capitalize">{selectedAlert.type.replace(/_/g, ' ')}</span>
            </div>
            <p className="text-sm text-text-primary">{selectedAlert.reason}</p>
            <div className="p-3 rounded-lg bg-white/5">
              <p className="text-xs text-text-muted mb-2 font-semibold">Rule</p>
              <p className="text-xs font-mono text-accent-secondary">{selectedAlert.explanation.rule}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(selectedAlert.explanation.inputs || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between p-2 rounded bg-white/5 text-xs">
                  <span className="text-text-muted">{k}</span>
                  <span className="font-mono">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
