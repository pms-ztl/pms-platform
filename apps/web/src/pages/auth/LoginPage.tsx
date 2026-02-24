import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShieldCheckIcon,
  BuildingOffice2Icon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  LockClosedIcon,
  EnvelopeIcon,
  FingerPrintIcon,
} from '@heroicons/react/24/outline';

import { useAuthStore } from '@/store/auth';
import { authApi, superAdminAuthApi } from '@/lib/api';

interface LoginFormData {
  email: string;
  password: string;
  tenantSlug?: string;
}

interface MfaFormData {
  code: string;
}

type LoginMode = 'select' | 'super-admin' | 'company';

// ── Butterfly hover — 3D tilt + symmetric mirror around cursor ──────────────
function useButterflyHover(intensity = 18) {
  const ref = useRef<HTMLButtonElement>(null);
  const rafRef = useRef(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      const rotY = nx * intensity;
      const rotX = -ny * intensity * 0.6;
      const scaleX = 1 + Math.abs(nx) * 0.03;
      const scaleY = 1 + Math.abs(ny) * 0.02;
      el.style.transform = `perspective(600px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(${scaleX}, ${scaleY}, 1)`;
      el.style.boxShadow = `${-nx * 10}px ${-ny * 8}px 30px -5px rgba(255,255,255,0.08), 0 0 0 0.5px rgba(255,255,255,0.06)`;
      el.style.setProperty('--glow-x', `${50 + nx * 40}%`);
      el.style.setProperty('--glow-y', `${50 + ny * 40}%`);
    });
  }, [intensity]);

  const handleMouseLeave = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    el.style.boxShadow = '';
    el.style.setProperty('--glow-x', '50%');
    el.style.setProperty('--glow-y', '50%');
  }, []);

  return { ref, handleMouseMove, handleMouseLeave };
}

// ── #21: Glass input with focus glow ring animation ─────────────────────────
const glassInput = 'w-full rounded-2xl border border-white/[0.1] bg-white/[0.06] text-xl text-white placeholder-white/30 focus:outline-none focus:border-white/[0.25] focus:bg-white/[0.1] focus:shadow-[0_0_0_3px_rgba(255,255,255,0.1),0_0_20px_rgba(255,255,255,0.05)] transition-all duration-300';

function GlassField({
  icon: Icon,
  label,
  error,
  children,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group">
      {/* #25: Label slides down on focus-within */}
      <label className="block text-lg font-medium text-white/55 mb-3 tracking-wider group-focus-within:text-white/80 group-focus-within:tracking-[0.2em] transition-all duration-300">
        {label}
      </label>
      <div className="relative">
        {/* #26: Icon glow pulse on focus */}
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none z-10">
          <Icon className="h-6 w-6 text-white/35 group-focus-within:text-white/70 group-focus-within:drop-shadow-[0_0_6px_rgba(255,255,255,0.25)] transition-all duration-300" />
        </div>
        {children}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-400/80 animate-slide-up">{error}</p>
      )}
    </div>
  );
}

// ── Pulse dots ──────────────────────────────────────────────────────────────
function PulseSpinner() {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-white animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

// ── Main LoginPage ──────────────────────────────────────────────────────────

// ── Butterfly mode buttons ───────────────────────────────────────────────────
function SuperAdminButton({ onClick }: { onClick: () => void }) {
  const { ref, handleMouseMove, handleMouseLeave } = useButterflyHover(14);
  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full group relative flex items-center gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-7 text-left hover:bg-white/[0.08] hover:border-white/[0.15] overflow-hidden"
      style={{ transition: 'transform 0.2s ease-out, background 0.4s, border-color 0.4s, box-shadow 0.3s ease-out', willChange: 'transform' }}
    >
      {/* Cursor-following glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-2xl pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(255,255,255,0.07) 0%, transparent 60%)' }} />
      </div>
      {/* #27: Icon container with glow pulse on hover */}
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/[0.1] group-hover:bg-white/[0.12] group-hover:border-white/[0.2] group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.12)]">
        <ShieldCheckIcon className="h-7 w-7 text-white/60 group-hover:text-white/90 transition-colors duration-300" />
      </div>
      <div className="relative flex-1 min-w-0">
        <h3 className="font-display text-2xl font-semibold text-white/90">Command Center</h3>
        <p className="text-lg text-white/50 group-hover:text-white/70 transition-colors duration-300">Full platform control & tenant orchestration</p>
      </div>
      <ArrowRightIcon className="relative h-5 w-5 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all duration-300" />
    </button>
  );
}

function CompanyButton({ onClick }: { onClick: () => void }) {
  const { ref, handleMouseMove, handleMouseLeave } = useButterflyHover(14);
  return (
    <button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="w-full group relative flex items-center gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-7 text-left hover:bg-white/[0.08] hover:border-white/[0.15] overflow-hidden"
      style={{ transition: 'transform 0.2s ease-out, background 0.4s, border-color 0.4s, box-shadow 0.3s ease-out', willChange: 'transform' }}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden rounded-2xl pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at var(--glow-x, 50%) var(--glow-y, 50%), rgba(255,255,255,0.07) 0%, transparent 60%)' }} />
      </div>
      {/* #28: Company icon with glow pulse on hover */}
      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] border border-white/[0.1] group-hover:bg-white/[0.12] group-hover:border-white/[0.2] group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.12)]">
        <BuildingOffice2Icon className="h-7 w-7 text-white/60 group-hover:text-white/90 transition-colors duration-300" />
      </div>
      <div className="relative flex-1 min-w-0">
        <h3 className="font-display text-2xl font-semibold text-white/90">Your Workspace</h3>
        <p className="text-lg text-white/50 group-hover:text-white/70 transition-colors duration-300">Lead, collaborate, or grow — your call</p>
      </div>
      <ArrowRightIcon className="relative h-5 w-5 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all duration-300" />
    </button>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [loginMode, setLoginMode] = useState<LoginMode>('select');
  const [showPassword, setShowPassword] = useState(false);

  const loginForm = useForm<LoginFormData>({
    defaultValues: { email: '', password: '', tenantSlug: '' },
  });

  const mfaForm = useForm<MfaFormData>({
    defaultValues: { code: '' },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      if (loginMode === 'super-admin') {
        const response = await superAdminAuthApi.login(data.email, data.password);
        if (response.mfaRequired) {
          setMfaRequired(true);
          setTempToken(response.tempToken ?? null);
          toast.success('Please enter your MFA code');
          return;
        }
        setTokens(response.token, '');
        const user = await authApi.me();
        setUser(user);
        toast.success('Command Center activated. Let\u2019s build.');
        navigate('/sa/dashboard');
      } else {
        const response = await authApi.login(data.email, data.password, data.tenantSlug || undefined);
        if ('mfaRequired' in response && response.mfaRequired) {
          setMfaRequired(true);
          setTempToken((response as { tempToken: string }).tempToken);
          toast.success('One more step — verify your identity');
          return;
        }
        // 🔒 Check roles BEFORE touching the store — avoids token-flip side effects
        const meRes = await fetch('/api/v1/auth/me', {
          headers: { Authorization: `Bearer ${response.accessToken}` },
        });
        const meBody = await meRes.json();
        const user = meBody.data;
        if (user?.roles?.includes('Super Admin')) {
          loginForm.reset();
          setLoginMode('select');
          toast.error("Super Admin accounts must sign in via Command Center, not Your Workspace.", { duration: 5000 });
          return;
        }
        setTokens(response.accessToken, response.refreshToken);
        setUser(user);
        toast.success('You\u2019re in. Time to make it count.');
        navigate('/dashboard');
      }
    } catch (error) {
      const axiosErr = error as any;
      const apiMsg: string =
        axiosErr?.response?.data?.error?.message ||
        axiosErr?.response?.data?.message ||
        (error instanceof Error ? error.message : '');
      // 🔒 Regular user trying "Command Center" — the API says "Super Admin role required"
      if (loginMode === 'super-admin' && apiMsg.includes('Super Admin role required')) {
        toast.error("This account doesn't have Command Center access. Please use 'Your Workspace' to sign in.", { duration: 5000 });
      } else {
        toast.error(apiMsg || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaVerify = async (data: MfaFormData) => {
    if (!tempToken) return;
    setIsLoading(true);
    try {
      if (loginMode === 'super-admin') {
        const response = await superAdminAuthApi.verifyMfa(tempToken, data.code);
        setTokens(response.token, '');
        const user = await authApi.me();
        setUser(user);
        toast.success('Identity verified. Command Center online.');
        navigate('/sa/dashboard');
      } else {
        const response = await authApi.verifyMfa(tempToken, data.code);
        setTokens(response.accessToken, response.refreshToken);
        const user = await authApi.me();
        setUser(user);
        toast.success('Verified. Let\u2019s make today count.');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid MFA code');
    } finally {
      setIsLoading(false);
    }
  };

  // ── MFA ────────────────────────────────────────────────────────────────────
  if (mfaRequired) {
    return (
      <div>
        <div className="flex items-center gap-4 mb-8 animate-slide-right-fade" style={{ animationDelay: '0.1s' }}>
          <div className="w-14 h-14 bg-white/[0.08] rounded-2xl flex items-center justify-center border border-white/[0.1] animate-breathe">
            <FingerPrintIcon className="w-6 h-6 text-white/80" />
          </div>
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Prove It's You</h2>
            <p className="text-sm text-white/55">Enter your 6-digit authenticator code to continue</p>
          </div>
        </div>

        <form onSubmit={mfaForm.handleSubmit(handleMfaVerify)} className="space-y-6 animate-slide-up-fade" style={{ animationDelay: '0.25s' }}>
          <div>
            <label className="block text-sm font-medium text-white/55 mb-2 tracking-wider">Verification Code</label>
            <input
              type="text"
              {...mfaForm.register('code', {
                required: 'Code is required',
                pattern: { value: /^\d{6}$/, message: 'Code must be 6 digits' },
              })}
              className={`${glassInput} px-5 py-4 text-center text-2xl tracking-[0.5em] font-mono`}
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
            {mfaForm.formState.errors.code && (
              <p className="mt-2 text-sm text-red-400/80">{mfaForm.formState.errors.code.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-white/[0.12] border border-white/[0.15] px-5 py-4 text-base font-semibold text-white shadow-[0_8px_24px_-6px_rgba(255,255,255,0.1)] hover:bg-white/[0.18] hover:shadow-[0_12px_32px_-6px_rgba(255,255,255,0.15)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? <PulseSpinner /> : 'Verify Code'}
          </button>

          <button
            type="button"
            onClick={() => { setMfaRequired(false); setTempToken(null); }}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 text-base font-medium text-white/55 hover:bg-white/[0.08] hover:text-white/75 transition-all duration-200"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Login
          </button>
        </form>
      </div>
    );
  }

  // ── Mode Selection — BIGGER ────────────────────────────────────────────────
  if (loginMode === 'select') {
    return (
      <div>
        <div className="mb-10 animate-slide-up-fade" style={{ animationDelay: '0.15s' }}>
          <h2 className="font-display text-5xl font-bold text-white mb-3">Step Into Your Arena</h2>
          <p className="text-white/55 text-2xl">Choose how you want to make an impact today</p>
        </div>

        {/* #23: Elastic bounce entrance for login buttons */}
        <div className="space-y-5">
          <div className="animate-elastic-in" style={{ animationDelay: '0.3s' }}>
            <SuperAdminButton onClick={() => setLoginMode('super-admin')} />
          </div>
          <div className="animate-elastic-in" style={{ animationDelay: '0.5s' }}>
            <CompanyButton onClick={() => setLoginMode('company')} />
          </div>
        </div>

        {/* #24: Lock icon heartbeat pulse */}
        <div className="mt-10 flex items-center justify-center gap-3 text-base text-white/35 animate-slide-up-fade" style={{ animationDelay: '0.7s' }}>
          <LockClosedIcon className="w-5 h-5 animate-heartbeat" />
          <span>Bank-grade security. Zero compromises.</span>
        </div>
      </div>
    );
  }

  // ── Login Form — BIGGER ─────────────────────────────────────────────────────
  const isSuperAdmin = loginMode === 'super-admin';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-7 animate-slide-right-fade" style={{ animationDelay: '0.1s' }}>
        <button
          onClick={() => { setLoginMode('select'); loginForm.reset(); }}
          className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/[0.05] text-white/35 hover:bg-white/[0.1] hover:text-white/60 active:scale-95 transition-all duration-200 border border-white/[0.06]"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <div>
          <h2 className="font-display text-4xl font-bold text-white">
            {isSuperAdmin ? 'Command Center' : 'Enter Your Workspace'}
          </h2>
          <p className="text-lg text-white/50">
            {isSuperAdmin ? 'Full platform orchestration awaits' : 'Your team is counting on you. Let\u2019s go.'}
          </p>
        </div>
      </div>

      {/* Badge */}
      <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium mb-7 border animate-scale-up-fade ${
        isSuperAdmin
          ? 'bg-white/[0.06] text-white/60 border-white/[0.1]'
          : 'bg-white/[0.06] text-white/60 border-white/[0.1]'
      }`} style={{ animationDelay: '0.2s' }}>
        {isSuperAdmin ? <ShieldCheckIcon className="h-3.5 w-3.5" /> : <BuildingOffice2Icon className="h-3.5 w-3.5" />}
        {isSuperAdmin ? 'Root Access' : 'Team Portal'}
      </div>

      <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5 animate-slide-up-fade" style={{ animationDelay: '0.3s' }}>
        <GlassField icon={EnvelopeIcon} label="Email" error={loginForm.formState.errors.email?.message}>
          <input
            type="email"
            {...loginForm.register('email', {
              required: 'Email is required',
              pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' },
            })}
            className={`${glassInput} pl-14 pr-6 py-5`}
            placeholder={isSuperAdmin ? 'admin@pms-platform.com' : 'you@company.com'}
            autoComplete="email"
            autoFocus
          />
        </GlassField>

        <GlassField icon={LockClosedIcon} label="Password" error={loginForm.formState.errors.password?.message}>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...loginForm.register('password', { required: 'Password is required' })}
              className={`${glassInput} pl-14 pr-14 py-5`}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-white/20 hover:text-white/50 transition-colors"
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </GlassField>

        {!isSuperAdmin && (
          <GlassField icon={BuildingOffice2Icon} label="Organization ID">
            <input
              type="text"
              {...loginForm.register('tenantSlug')}
              className={`${glassInput} pl-14 pr-6 py-5`}
              placeholder="e.g. acme-corp"
            />
            <p className="mt-1.5 text-xs text-white/35">Your org's unique ID — check with your admin if unsure</p>
          </GlassField>
        )}

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center cursor-pointer group/check">
            <input type="checkbox" className="sr-only peer" />
            {/* #30: Animated checkbox with scale pop */}
            <div className="h-4 w-4 rounded border border-white/[0.12] bg-white/[0.04] peer-checked:bg-white/[0.25] peer-checked:border-white/[0.3] peer-checked:scale-110 peer-checked:shadow-[0_0_10px_rgba(255,255,255,0.15)] flex items-center justify-center transition-all duration-300">
              <svg className="w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <span className="ml-2.5 text-base text-white/50 group-hover/check:text-white/70 transition-colors">Remember me</span>
          </label>
          {!isSuperAdmin && (
            <Link to="/forgot-password" className="text-base font-medium text-white/50 hover:text-white/70 transition-colors">
              Forgot password?
            </Link>
          )}
        </div>

        {/* #22: Submit button with aurora gradient + shine sweep + ripple */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full group relative overflow-hidden rounded-2xl px-8 py-6 text-xl font-bold text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(200,210,230,0.18) 25%, rgba(255,255,255,0.14) 50%, rgba(200,210,230,0.18) 75%, rgba(255,255,255,0.12) 100%)',
            backgroundSize: '200% 200%',
            animation: 'auroraBtn 3s ease-in-out infinite',
            boxShadow: '0 8px 24px -6px rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {/* Shine sweep */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 overflow-hidden">
            <div className="absolute -inset-full rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:translate-x-full transition-transform duration-700" />
          </div>
          {/* Hover glow ring */}
          <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{
            boxShadow: '0 0 30px rgba(255,255,255,0.12), inset 0 0 30px rgba(255,255,255,0.04)',
          }} />
          <span className="relative flex items-center justify-center gap-2.5">
            {isLoading ? (
              <PulseSpinner />
            ) : (
              <>
                {isSuperAdmin && <ShieldCheckIcon className="h-5 w-5" />}
                {isSuperAdmin ? 'Launch Command Center' : 'Let\u2019s Go'}
                <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-300" />
              </>
            )}
          </span>
        </button>
      </form>

      {/* SSO */}
      {!isSuperAdmin && (
        <div className="mt-6 animate-slide-up-fade" style={{ animationDelay: '0.5s' }}>
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.05]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-xs text-white/35 bg-transparent">Or jump in with</span>
            </div>
          </div>
          {/* #29: SSO button with shimmer sweep on hover */}
          <button
            type="button"
            className="w-full group/sso relative flex items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-5 py-3.5 text-sm font-medium text-white/55 hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white/70 transition-all duration-300 overflow-hidden"
            onClick={() => toast('SSO is available for Enterprise plan tenants.')}
          >
            {/* Shine sweep on hover */}
            <div className="absolute inset-0 opacity-0 group-hover/sso:opacity-100 transition-opacity duration-500">
              <div className="absolute -inset-full rotate-12 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover/sso:translate-x-full transition-transform duration-700" />
            </div>
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google SSO
            <span className="text-2xs text-white/30 bg-white/[0.06] px-2 py-0.5 rounded-full">Enterprise</span>
          </button>
        </div>
      )}
    </div>
  );
}
