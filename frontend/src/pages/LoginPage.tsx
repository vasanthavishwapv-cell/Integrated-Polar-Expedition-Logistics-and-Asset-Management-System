import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Radio, Eye, EyeOff, AlertCircle, Loader2, ShieldCheck, Satellite, KeyRound } from 'lucide-react';
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
    <div className="min-h-screen bg-white flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-bg-secondary border-r border-[#C6C7BD]/50 relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #C6C7BD 1px, transparent 0)', backgroundSize: '24px 24px' }}
        />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-[#1C2B3C] flex items-center justify-center text-white shadow-sm">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#1C2B3C] tracking-wide">POLARIS</div>
              <div className="text-xs text-text-muted">Polar Logistics & Resource Intelligence System</div>
            </div>
          </div>
          <blockquote className="text-3xl font-light text-[#1C2B3C] leading-snug tracking-tight">
            Unified command for<br />
            <span className="font-bold text-[#1C2B3C]">polar expeditions</span>
          </blockquote>
          <p className="mt-4 text-text-muted text-sm max-w-sm leading-relaxed">
            Integrated platform for expedition scheduling, multi-station cargo replenishment, and emergency mitigation across Antarctica.
          </p>
        </div>

        {/* Security & Uplink Status */}
        <div className="relative text-xs text-text-muted border-t border-[#C6C7BD]/50 pt-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-text-muted">
              <ShieldCheck className="w-4 h-4 text-status-success" />
              Security Architecture
            </span>
            <span className="font-mono text-text-primary text-[11px] font-semibold">AES-256 TLS v1.3</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-text-muted">
              <Satellite className="w-4 h-4 text-[#4B5C6C]" />
              Database Engine
            </span>
            <span className="font-mono text-[#1C2B3C] text-[11px] font-semibold">TiDB Cloud Distributed</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-text-muted">
              <KeyRound className="w-4 h-4 text-[#4B5C6C]" />
              Access Control
            </span>
            <span className="font-mono text-text-primary text-[11px] font-semibold">Role-Based Multi-Tier</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#1C2B3C] flex items-center justify-center text-white">
              <Radio className="w-4 h-4" />
            </div>
            <span className="text-xl font-bold text-[#1C2B3C]">POLARIS</span>
          </div>

          <h1 className="text-2xl font-bold text-text-primary mb-1 tracking-tight">Sign in</h1>
          <p className="text-sm text-text-muted mb-8">Access your polar operations dashboard</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-text-secondary mb-1.5">
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
              <label htmlFor="password" className="block text-xs font-semibold text-text-secondary mb-1.5">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-status-danger">{errors.password.message}</p>}
            </div>

            {serverError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-status-danger flex-shrink-0" />
                <p className="text-xs text-status-danger font-medium">{serverError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
              id="login-submit-btn"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
              ) : (
                'Sign in to POLARIS'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
