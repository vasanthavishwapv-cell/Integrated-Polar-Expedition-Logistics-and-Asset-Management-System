import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullPage?: boolean;
}

export default function LoadingSpinner({ size = 'md', text, fullPage }: LoadingSpinnerProps) {
  const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };

  const content = (
    <div className="flex flex-col items-center gap-3">
      <Loader2 className={`${sizeMap[size]} text-accent-primary animate-spin`} />
      {text && <p className="text-sm text-text-muted">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        {content}
      </div>
    );
  }
  return content;
}
