interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_COLORS: Record<string, string> = {
  // Expedition
  draft: 'bg-slate-500/20 text-slate-400',
  planned: 'bg-blue-500/20 text-blue-400',
  active: 'bg-status-success/20 text-status-success',
  completed: 'bg-accent-primary/20 text-accent-primary',
  cancelled: 'bg-status-danger/20 text-status-danger',
  // Shipment
  created: 'bg-slate-500/20 text-slate-400',
  prepared: 'bg-blue-500/20 text-blue-400',
  dispatched: 'bg-purple-500/20 text-purple-400',
  in_transit: 'bg-amber-500/20 text-amber-400',
  delayed: 'bg-status-danger/20 text-status-danger',
  arrived: 'bg-teal-500/20 text-teal-400',
  received: 'bg-status-success/20 text-status-success',
  // Alert/Severity
  open: 'bg-status-danger/20 text-status-danger',
  acknowledged: 'bg-status-warning/20 text-status-warning',
  resolved: 'bg-status-success/20 text-status-success',
  closed: 'bg-slate-500/20 text-slate-400',
  low: 'bg-blue-500/20 text-blue-400',
  medium: 'bg-status-warning/20 text-status-warning',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-status-danger/20 text-status-danger animate-pulse',
  // Asset
  operational: 'bg-status-success/20 text-status-success',
  under_maintenance: 'bg-blue-500/20 text-blue-400',
  fault_reported: 'bg-status-warning/20 text-status-warning',
  out_of_service: 'bg-status-danger/20 text-status-danger',
  retired: 'bg-slate-500/20 text-slate-400',
  // Personnel
  assigned: 'bg-blue-500/20 text-blue-400',
  preparing: 'bg-purple-500/20 text-purple-400',
  at_station: 'bg-status-success/20 text-status-success',
  on_assignment: 'bg-teal-500/20 text-teal-400',
  returned: 'bg-slate-500/20 text-slate-400',
  status_verification_required: 'bg-status-warning/20 text-status-warning',
  // Incident
  reported: 'bg-status-danger/20 text-status-danger',
  assessing: 'bg-purple-500/20 text-purple-400',
  response_in_progress: 'bg-status-warning/20 text-status-warning',
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || 'bg-slate-500/20 text-slate-400';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`status-badge ${colors} ${size === 'md' ? 'px-3 py-1 text-sm' : ''}`}>
      {label}
    </span>
  );
}
