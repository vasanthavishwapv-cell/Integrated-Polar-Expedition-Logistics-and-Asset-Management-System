import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  color?: 'cyan' | 'success' | 'warning' | 'danger' | 'purple';
  onClick?: () => void;
  isLoading?: boolean;
}

const COLOR_MAP = {
  cyan: { icon: 'text-accent-primary', bg: 'bg-accent-primary/10', glow: 'hover:shadow-accent-primary/10' },
  success: { icon: 'text-status-success', bg: 'bg-status-success/10', glow: 'hover:shadow-status-success/10' },
  warning: { icon: 'text-status-warning', bg: 'bg-status-warning/10', glow: 'hover:shadow-status-warning/10' },
  danger: { icon: 'text-status-danger', bg: 'bg-status-danger/10', glow: 'hover:shadow-status-danger/10' },
  purple: { icon: 'text-purple-400', bg: 'bg-purple-400/10', glow: 'hover:shadow-purple-400/10' },
};

export default function KPICard({ title, value, icon: Icon, trend, trendLabel, color = 'cyan', onClick, isLoading }: KPICardProps) {
  const colors = COLOR_MAP[color];

  return (
    <div
      className={`kpi-card ${onClick ? 'cursor-pointer' : ''} ${colors.glow} hover:shadow-lg`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${colors.icon}`} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${trend > 0 ? 'text-status-success' : trend < 0 ? 'text-status-danger' : 'text-text-muted'}`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        {isLoading ? (
          <div className="h-7 w-16 rounded bg-white/5 animate-pulse" />
        ) : (
          <div className="text-2xl font-bold text-text-primary">{value}</div>
        )}
        <div className="text-xs text-text-muted mt-0.5">{title}</div>
        {trendLabel && <div className="text-[10px] text-text-muted mt-0.5">{trendLabel}</div>}
      </div>
    </div>
  );
}
