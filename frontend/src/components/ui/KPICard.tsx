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
  cyan: { icon: 'text-[#1C2B3C]', bg: 'bg-[#EBEFF0]', glow: 'hover:border-[#4B5C6C]' },
  success: { icon: 'text-emerald-700', bg: 'bg-emerald-50', glow: 'hover:border-emerald-300' },
  warning: { icon: 'text-amber-700', bg: 'bg-amber-50', glow: 'hover:border-amber-300' },
  danger: { icon: 'text-red-700', bg: 'bg-red-50', glow: 'hover:border-red-300' },
  purple: { icon: 'text-[#4B5C6C]', bg: 'bg-[#EBEFF0]', glow: 'hover:border-[#4B5C6C]' },
};

export default function KPICard({ title, value, icon: Icon, trend, trendLabel, color = 'cyan', onClick, isLoading }: KPICardProps) {
  const colors = COLOR_MAP[color];

  return (
    <div
      className={`kpi-card ${onClick ? 'cursor-pointer' : ''} ${colors.glow}`}
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
          <div className={`flex items-center gap-1 text-xs font-semibold ${trend > 0 ? 'text-status-success' : trend < 0 ? 'text-status-danger' : 'text-text-muted'}`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        {isLoading ? (
          <div className="h-7 w-16 rounded bg-[#EBEFF0] animate-pulse" />
        ) : (
          <div className="text-2xl font-bold text-text-primary tracking-tight">{value}</div>
        )}
        <div className="text-xs font-medium text-text-secondary mt-1">{title}</div>
        {trendLabel && <div className="text-[10px] text-text-muted mt-0.5">{trendLabel}</div>}
      </div>
    </div>
  );
}
