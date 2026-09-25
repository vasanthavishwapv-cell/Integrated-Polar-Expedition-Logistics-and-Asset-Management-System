import { LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-accent-primary/10 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-accent-primary/60" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      {description && <p className="text-sm text-text-muted max-w-xs mb-6">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {action.label}
        </button>
      )}
    </div>
  );
}
