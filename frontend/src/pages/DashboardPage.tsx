import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Map, Package, Archive, Brain, Users, Wrench, AlertTriangle, Bell,
  TrendingUp, Activity, LayoutDashboard,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts';
import api from '../services/api';
import KPICard from '../components/ui/KPICard';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorAlert from '../components/ui/ErrorAlert';

const CHART_COLORS = ['#1C2B3C', '#4B5C6C', '#676A70', '#C6C7BD', '#0284C7', '#10B981', '#F59E0B'];

interface KPIs {
  totalExpeditions: number;
  activeExpeditions: number;
  plannedExpeditions: number;
  shipmentsInTransit: number;
  delayedShipments: number;
  openInventoryAlerts: number;
  operationalAssets: number;
  totalAssets: number;
  openIncidents: number;
  criticalIncidents: number;
  activePersonnel: number;
  openAlerts: number;
}

interface Analytics {
  expeditionStatusDist: Array<{ _id: string; count: number }>;
  shipmentStatusDist: Array<{ _id: string; count: number }>;
  incidentSeverityDist: Array<{ _id: string; count: number }>;
  inventoryByCategory: Array<{ _id: string; totalOnHand: number; itemCount: number }>;
  assetStatusDist: Array<{ _id: string; count: number }>;
  consumptionTrend: Array<{ _id: string; total: number }>;
  recentActivity: Array<{ action: string; entityType: string; performedBy: { name: string }; createdAt: string }>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white p-3 text-xs border border-[#C6C7BD] rounded-lg shadow-lg">
        <p className="text-[#676A70] font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-medium">
            {p.name}: <strong className="text-[#1C2B3C]">{p.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [kpiRes, analyticsRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/analytics'),
      ]);
      setKpis(kpiRes.data.data.kpis);
      setAnalytics(analyticsRes.data.data);
    } catch {
      setError('Failed to load dashboard data. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingSpinner fullPage text="Loading command dashboard..." />;
  if (error) return <ErrorAlert message={error} onRetry={load} />;

  const expeditionPieData = analytics?.expeditionStatusDist.map((d) => ({ name: d._id, value: d.count })) || [];
  const shipmentBarData = analytics?.shipmentStatusDist.map((d) => ({ status: d._id.replace(/_/g, ' '), count: d.count })) || [];
  const incidentPieData = analytics?.incidentSeverityDist.map((d) => ({ name: d._id, value: d.count })) || [];
  const inventoryBarData = analytics?.inventoryByCategory.map((d) => ({ category: d._id.replace(/_/g, ' '), onHand: d.totalOnHand, items: d.itemCount })) || [];
  const consumptionData = analytics?.consumptionTrend.slice(-14).map((d) => ({ date: d._id.slice(5), consumption: d.total })) || [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <LayoutDashboard className="w-5 h-5 text-accent-primary" />
        <h1 className="text-xl font-bold text-text-primary">Command Dashboard</h1>
        <span className="text-xs text-text-muted ml-auto">All data live from MongoDB</span>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <KPICard title="Active Expeditions" value={kpis?.activeExpeditions ?? '—'} icon={Map} color="cyan" onClick={() => navigate('/expeditions?status=active')} />
        <KPICard title="Shipments In Transit" value={kpis?.shipmentsInTransit ?? '—'} icon={Package} color="purple" onClick={() => navigate('/cargo?status=in_transit')} />
        <KPICard title="Delayed Shipments" value={kpis?.delayedShipments ?? '—'} icon={Package} color="danger" onClick={() => navigate('/cargo?status=delayed')} />
        <KPICard title="Inventory Alerts" value={kpis?.openInventoryAlerts ?? '—'} icon={Archive} color="warning" onClick={() => navigate('/alerts?type=low_stock')} />
        <KPICard title="Operational Assets" value={`${kpis?.operationalAssets ?? '—'}/${kpis?.totalAssets ?? '—'}`} icon={Wrench} color="success" onClick={() => navigate('/assets')} />
        <KPICard title="Open Incidents" value={kpis?.openIncidents ?? '—'} icon={AlertTriangle} color={kpis?.criticalIncidents ? 'danger' : 'cyan'} onClick={() => navigate('/emergency')} />
        <KPICard title="Open Alerts" value={kpis?.openAlerts ?? '—'} icon={Bell} color="warning" onClick={() => navigate('/alerts?status=open')} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Expedition status donut */}
        <div className="glass-card p-5">
          <h2 className="section-header"><Map className="w-4 h-4 text-accent-primary" /> Expedition Status</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={expeditionPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                {expeditionPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {expeditionPieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-text-muted capitalize">{d.name}</span>
                <span className="text-text-primary font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shipment status bar */}
        <div className="glass-card p-5">
          <h2 className="section-header"><Package className="w-4 h-4 text-accent-primary" /> Shipment Status</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={shipmentBarData} layout="vertical" margin={{ left: 8 }}>
              <XAxis type="number" tick={{ fontSize: 10, fill: '#676A70' }} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 9, fill: '#676A70' }} width={70} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {shipmentBarData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Incident severity donut */}
        <div className="glass-card p-5">
          <h2 className="section-header"><AlertTriangle className="w-4 h-4 text-status-danger" /> Active Incidents</h2>
          {incidentPieData.length === 0 ? (
            <div className="flex items-center justify-center h-[180px] text-xs text-text-muted">No active incidents</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={incidentPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                  {incidentPieData.map((d, i) => (
                    <Cell key={i} fill={d.name === 'critical' ? '#DC2626' : d.name === 'high' ? '#EA580C' : d.name === 'medium' ? '#D97706' : '#2563EB'} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Consumption trend line chart */}
        <div className="glass-card p-5">
          <h2 className="section-header"><TrendingUp className="w-4 h-4 text-accent-primary" /> Inventory Consumption (14 days)</h2>
          {consumptionData.length === 0 ? (
            <div className="flex items-center justify-center h-[180px] text-xs text-text-muted">No consumption data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={consumptionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBEFF0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#676A70' }} />
                <YAxis tick={{ fontSize: 10, fill: '#676A70' }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="consumption" stroke="#1C2B3C" strokeWidth={2.5} dot={{ fill: '#1C2B3C', r: 3 }} name="Units consumed" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Inventory by category bar */}
        <div className="glass-card p-5">
          <h2 className="section-header"><Archive className="w-4 h-4 text-accent-primary" /> Stock by Category</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={inventoryBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBEFF0" />
              <XAxis dataKey="category" tick={{ fontSize: 8, fill: '#676A70' }} angle={-30} textAnchor="end" height={40} />
              <YAxis tick={{ fontSize: 10, fill: '#676A70' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="onHand" fill="#4B5C6C" radius={[4, 4, 0, 0]} name="On-hand" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-5">
        <h2 className="section-header"><Activity className="w-4 h-4 text-accent-primary" /> Recent Activity</h2>
        {!analytics?.recentActivity?.length ? (
          <p className="text-sm text-text-muted text-center py-6">No recent activity recorded</p>
        ) : (
          <div className="space-y-2">
            {analytics.recentActivity.slice(0, 10).map((log, i) => (
              <div key={i} className="flex items-center gap-3 text-sm py-2 border-b border-[rgba(148,163,184,0.06)] last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-accent-primary flex-shrink-0" />
                <span className="text-text-muted capitalize">{log.action.replace(/_/g, ' ')}</span>
                <StatusBadge status={log.entityType.toLowerCase()} />
                <span className="ml-auto text-xs text-text-muted font-mono">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
