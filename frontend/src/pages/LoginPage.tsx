import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Radio, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password required'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [serverError, setServerError] = useState('');
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError('');
    try {
      const res = await api.post('/auth/login', data);
      const { accessToken, user } = res.data.data;
      setAuth(user, accessToken);
      navigate('/dashboard');
    } catch (err: any) {
      setServerError(err?.response?.data?.error?.message || 'Login failed. Check credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-bg-secondary border-r border-[rgba(148,163,184,0.1)] relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-5"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #48CAE4 1px, transparent 0)', backgroundSize: '32px 32px' }}
        />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-accent-primary/20 flex items-center justify-center">
              <Radio className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <div className="text-xl font-bold text-gradient">POLARIS</div>
              <div className="text-xs text-text-muted">Polar Logistics & Resource Intelligence System</div>
            </div>
          </div>
          <blockquote className="text-2xl font-light text-text-primary leading-relaxed">
            Unified command for<br />
            <span className="text-gradient font-semibold">polar operations</span>
          </blockquote>
          <p className="mt-4 text-text-muted text-sm max-w-xs">
            Replacing fragmented spreadsheets and radio logs with a single integrated platform for expedition planning, cargo tracking, and emergency coordination.
          </p>
        </div>
        {/* Security & Uplink Status */}
        <div className="relative text-xs text-text-muted border-t border-[rgba(148,163,184,0.1)] pt-6 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Security Architecture</span>
            <span className="font-mono text-status-success text-[11px]">AES-256 TLS v1.3</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Station Gateway</span>
            <span className="font-mono text-accent-primary text-[11px]">Satellite Mesh Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Access Control</span>
            <span className="font-mono text-text-primary text-[11px]">Role-Based Multi-Tier</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <Radio className="w-6 h-6 text-accent-primary" />
            <span className="text-xl font-bold text-gradient">POLARIS</span>
          </div>

          <h1 className="text-2xl font-bold text-text-primary mb-1">Sign in</h1>
          <p className="text-sm text-text-muted mb-8">Access your polar operations dashboard</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-text-muted mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                className="input-field"
                placeholder="vasanthavishwa@polaris.com"
              />
              {errors.email && <p className="mt-1 text-xs text-status-danger">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-medium text-text-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-status-danger">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-status-danger/10 border border-status-danger/20">
                <AlertCircle className="w-4 h-4 text-status-danger flex-shrink-0" />
                <p className="text-xs text-status-danger">{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
              id="login-submit-btn"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                'Sign in to POLARIS'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-text-muted">
            <a href="/" className="hover:text-accent-primary">← Back to project overview</a>
          </p>
        </div>
      </div>
    </div>
  );
}
