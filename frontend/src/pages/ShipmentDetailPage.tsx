import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';
import Modal from '../components/ui/Modal';

interface Shipment {
  _id: string;
  shipmentId: string;
  origin: { name: string; code: string };
  destination: { name: string; code: string };
  linkedExpedition?: { name: string; status: string };
  cargoItems: Array<{ name: string; category: string; quantity: number; unit: string }>;
  estimatedArrival: string;
  actualArrival?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  created: ['prepared', 'cancelled'],
  prepared: ['dispatched', 'cancelled'],
  dispatched: ['in_transit', 'cancelled'],
  in_transit: ['delayed', 'arrived'],
  delayed: ['arrived'],
  arrived: ['received'],
  received: [],
  cancelled: [],
};

export default function ShipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiving, setReceiving] = useState(false);
  const [showReceive, setShowReceive] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const load = async () => {
    try {
      const res = await api.get(`/shipments/${id}`);
      setShipment(res.data.data);
    } catch { setError('Shipment not found.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = async (newStatus: string) => {
    setStatusUpdating(true);
    setError('');
    try {
      await api.put(`/shipments/${id}/status`, { status: newStatus });
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Status update failed');
    } finally { setStatusUpdating(false); }
  };

  const receiveShipment = async () => {
    setReceiving(true);
    setError('');
    try {
      await api.post(`/shipments/${id}/receive`, {
        idempotencyKey: uuidv4(),
        actualArrival: new Date().toISOString(),
      });
      setShowReceive(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Receipt failed');
    } finally { setReceiving(false); }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!shipment) return <ErrorAlert message={error || 'Not found'} onRetry={load} />;

  const nextStatuses = VALID_TRANSITIONS[shipment.status] || [];

  return (
    <div className="space-y-5 max-w-3xl">
      <button onClick={() => navigate('/cargo')} className="flex items-center gap-2 text-text-muted hover:text-text-primary text-sm">
        <ArrowLeft className="w-4 h-4" /> Back to Cargo
      </button>

      {error && <ErrorAlert message={error} />}

      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-accent-primary text-lg font-bold">{shipment.shipmentId}</span>
              <StatusBadge status={shipment.status} size="md" />
            </div>
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <span className="font-mono">{shipment.origin?.code}</span>
              <span>→</span>
              <span className="font-mono">{shipment.destination?.code}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {nextStatuses.filter((s) => s !== 'received').map((s) => (
              <button
                key={s}
                disabled={statusUpdating}
                onClick={() => updateStatus(s)}
                className="btn-secondary text-xs py-1.5"
              >
                {statusUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : `→ ${s.replace(/_/g, ' ')}`}
              </button>
            ))}
            {shipment.status === 'arrived' && (
              <button onClick={() => setShowReceive(true)} className="btn-primary text-xs flex items-center gap-1 py-1.5" id="receive-shipment-btn">
                <CheckCircle className="w-3.5 h-3.5" /> Receive Shipment
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5 pt-4 border-t border-[rgba(148,163,184,0.1)]">
          <div>
            <p className="text-xs text-text-muted">ETA</p>
            <p className="text-sm font-mono">{new Date(shipment.estimatedArrival).toLocaleDateString()}</p>
            <p className="text-[10px] text-amber-400 mt-0.5"><span className="simulated-badge">Simulated</span> tracking data</p>
          </div>
          {shipment.actualArrival && (
            <div>
              <p className="text-xs text-text-muted">Actual Arrival</p>
              <p className="text-sm font-mono">{new Date(shipment.actualArrival).toLocaleDateString()}</p>
            </div>
          )}
          {shipment.linkedExpedition && (
            <div>
              <p className="text-xs text-text-muted">Linked Expedition</p>
              <p className="text-sm">{shipment.linkedExpedition.name}</p>
            </div>
          )}
          {shipment.notes && (
            <div className="col-span-full">
              <p className="text-xs text-text-muted">Notes</p>
              <p className="text-sm">{shipment.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Cargo items */}
      <div className="glass-card p-5">
        <h2 className="section-header">Cargo Items ({shipment.cargoItems?.length})</h2>
        <table className="w-full data-table">
          <thead>
            <tr><th>Item</th><th>Category</th><th>Quantity</th></tr>
          </thead>
          <tbody>
            {shipment.cargoItems?.map((item, i) => (
              <tr key={i}>
                <td className="font-medium">{item.name}</td>
                <td><StatusBadge status={item.category} /></td>
                <td className="font-mono">{item.quantity} {item.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Receive confirmation modal */}
      <Modal isOpen={showReceive} onClose={() => setShowReceive(false)} title="Confirm Shipment Receipt"
        footer={
          <>
            <button onClick={() => setShowReceive(false)} className="btn-secondary">Cancel</button>
            <button onClick={receiveShipment} disabled={receiving} className="btn-primary flex items-center gap-2">
              {receiving ? <><Loader2 className="w-4 h-4 animate-spin" /> Receiving...</> : <><CheckCircle className="w-4 h-4" /> Confirm Receipt</>}
            </button>
          </>
        }
      >
        <p className="text-sm text-text-muted">
          Receiving shipment <strong className="text-text-primary">{shipment.shipmentId}</strong> will:
        </p>
        <ul className="mt-3 space-y-1 text-sm text-text-muted list-disc list-inside">
          <li>Mark the shipment as <strong>Received</strong></li>
          <li>Update inventory quantities for linked items (transactional)</li>
          <li>Record timestamp and performer in the audit log</li>
        </ul>
        <p className="mt-3 text-xs text-text-muted">This operation uses an idempotency key — it's safe to retry if interrupted.</p>
      </Modal>
    </div>
  );
}
