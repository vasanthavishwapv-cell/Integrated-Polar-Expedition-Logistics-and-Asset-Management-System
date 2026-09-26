interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_COLORS: Record<string, string> = {
  // Expedition
  draft: 'bg-[#EBEFF0] text-[#4B5C6C] border border-[#C6C7BD]',
  planned: 'bg-sky-50 text-sky-800 border border-sky-200',
  active: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  completed: 'bg-[#EBEFF0] text-[#1C2B3C] border border-[#C6C7BD]',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',

  // Shipment
  manifest_created: 'bg-[#EBEFF0] text-[#4B5C6C] border border-[#C6C7BD]',
  created: 'bg-[#EBEFF0] text-[#4B5C6C] border border-[#C6C7BD]',
  prepared: 'bg-sky-50 text-sky-800 border border-sky-200',
  dispatched: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
  in_transit: 'bg-amber-50 text-amber-800 border border-amber-200',
  delayed: 'bg-red-50 text-red-700 border border-red-200',
  arrived: 'bg-teal-50 text-teal-800 border border-teal-200',
  received: 'bg-emerald-50 text-emerald-800 border border-emerald-200',

  // Alert/Severity
  open: 'bg-red-50 text-red-700 border border-red-200',
  acknowledged: 'bg-amber-50 text-amber-800 border border-amber-200',
  resolved: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  closed: 'bg-[#EBEFF0] text-[#676A70] border border-[#C6C7BD]',
  info: 'bg-sky-50 text-sky-800 border border-sky-200',
  warning: 'bg-amber-50 text-amber-800 border border-amber-200',
  low: 'bg-sky-50 text-sky-800 border border-sky-200',
  medium: 'bg-amber-50 text-amber-800 border border-amber-200',
  moderate: 'bg-amber-50 text-amber-800 border border-amber-200',
  high: 'bg-orange-50 text-orange-800 border border-orange-200',
  severe: 'bg-orange-50 text-orange-800 border border-orange-200',
  critical: 'bg-red-100 text-red-900 border border-red-300 font-bold',

  // Asset
  operational: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  maintenance_due: 'bg-amber-50 text-amber-800 border border-amber-200',
  under_maintenance: 'bg-sky-50 text-sky-800 border border-sky-200',
  under_repair: 'bg-amber-50 text-amber-800 border border-amber-200',
  fault_reported: 'bg-red-50 text-red-700 border border-red-200',
  out_of_service: 'bg-red-50 text-red-700 border border-red-200',
  decommissioned: 'bg-[#EBEFF0] text-[#676A70] border border-[#C6C7BD]',
  retired: 'bg-[#EBEFF0] text-[#676A70] border border-[#C6C7BD]',

  // Personnel
  valid: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  expiring_soon: 'bg-amber-50 text-amber-800 border border-amber-200',
  expired: 'bg-red-50 text-red-700 border border-red-200',
  assigned: 'bg-sky-50 text-sky-800 border border-sky-200',
  preparing: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
  at_station: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  on_assignment: 'bg-teal-50 text-teal-800 border border-teal-200',
  returned: 'bg-[#EBEFF0] text-[#676A70] border border-[#C6C7BD]',
  status_verification_required: 'bg-amber-50 text-amber-800 border border-amber-200',

  // Incident
  reported: 'bg-red-50 text-red-700 border border-red-200',
  investigating: 'bg-amber-50 text-amber-800 border border-amber-200',
  mitigated: 'bg-sky-50 text-sky-800 border border-sky-200',
  assessing: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
  response_in_progress: 'bg-amber-50 text-amber-800 border border-amber-200',
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] || 'bg-[#EBEFF0] text-[#4B5C6C] border border-[#C6C7BD]';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span className={`status-badge ${colors} ${size === 'md' ? 'px-3 py-1 text-sm' : ''}`}>
      {label}
    </span>
  );
}
