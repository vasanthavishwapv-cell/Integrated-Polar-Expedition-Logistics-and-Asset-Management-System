import { useNavigate } from 'react-router-dom';
import { Home, Radio } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
      <Radio className="w-12 h-12 text-accent-primary/40 mb-4" />
      <h1 className="text-4xl font-bold text-gradient mb-2">404</h1>
      <p className="text-text-muted mb-6">Signal lost — page not found in polar coordinates</p>
      <button onClick={() => navigate('/dashboard')} className="btn-primary flex items-center gap-2">
        <Home className="w-4 h-4" /> Return to Dashboard
      </button>
    </div>
  );
}
