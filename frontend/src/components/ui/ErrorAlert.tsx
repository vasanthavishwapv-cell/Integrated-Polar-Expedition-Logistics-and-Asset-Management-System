import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorAlert({ message, onRetry }: ErrorAlertProps) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-status-danger/10 border border-status-danger/20">
      <AlertCircle className="w-5 h-5 text-status-danger flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm text-status-danger">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 flex items-center gap-1 text-xs text-status-danger hover:text-red-400 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
