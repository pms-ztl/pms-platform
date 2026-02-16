import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ShieldCheckIcon,
  BuildingOffice2Icon,
  EyeIcon,
  EyeSlashIcon,
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
        // Super Admin uses dedicated /api/admin/auth/login endpoint
        const response = await superAdminAuthApi.login(data.email, data.password);

        if (response.mfaRequired) {
          setMfaRequired(true);
          setTempToken(response.tempToken ?? null);
          toast.success('Please enter your MFA code');
          return;
        }

        // SA login returns { token, user } — set the token then fetch full profile
        setTokens(response.token, '');
        const user = await authApi.me();
        setUser(user);
        toast.success('Welcome back, Super Admin!');
        navigate('/sa/dashboard');
      } else {
        // Company login uses standard /api/v1/auth/login endpoint
        const response = await authApi.login(
          data.email,
          data.password,
          data.tenantSlug || undefined
        );

        if ('mfaRequired' in response && response.mfaRequired) {
          setMfaRequired(true);
          setTempToken((response as { tempToken: string }).tempToken);
          toast.success('Please enter your MFA code');
          return;
        }

        setTokens(response.accessToken, response.refreshToken);
        const user = await authApi.me();
        setUser(user);
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed');
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
        toast.success('Welcome back, Super Admin!');
        navigate('/sa/dashboard');
      } else {
        const response = await authApi.verifyMfa(tempToken, data.code);
        setTokens(response.accessToken, response.refreshToken);
        const user = await authApi.me();
        setUser(user);
        toast.success('Welcome back!');
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid MFA code');
    } finally {
      setIsLoading(false);
    }
  };

  // MFA verification screen
  if (mfaRequired) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
          Two-Factor Authentication
        </h2>
        <p className="text-secondary-600 dark:text-secondary-400 mb-8">
          Enter the 6-digit code from your authenticator app.
        </p>

        <form onSubmit={mfaForm.handleSubmit(handleMfaVerify)} className="space-y-6">
          <div>
            <label htmlFor="code" className="label">Verification Code</label>
            <input
              type="text"
              id="code"
              {...mfaForm.register('code', {
                required: 'Code is required',
                pattern: { value: /^\d{6}$/, message: 'Code must be 6 digits' },
              })}
              className="input text-center text-2xl tracking-widest"
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
            {mfaForm.formState.errors.code && (
              <p className="mt-1 text-sm text-danger-600">{mfaForm.formState.errors.code.message}</p>
            )}
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full">
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying...
              </span>
            ) : 'Verify'}
          </button>

          <button
            type="button"
            onClick={() => { setMfaRequired(false); setTempToken(null); }}
            className="btn-ghost w-full"
          >
            Back to login
          </button>
        </form>
      </div>
    );
  }

  // Login mode selection screen
  if (loginMode === 'select') {
    return (
      <div>
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">
          Welcome to PMS Platform
        </h2>
        <p className="text-secondary-600 dark:text-secondary-400 mb-8">
          Select your login type to continue.
        </p>

        <div className="space-y-4">
          <button
            onClick={() => setLoginMode('super-admin')}
            className="w-full group relative flex items-center gap-4 rounded-xl border-2 border-secondary-200 dark:border-secondary-700 p-5 text-left transition-all duration-200 hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/10"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/40">
              <ShieldCheckIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Super Admin</h3>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Platform administration & tenant management</p>
            </div>
            <svg className="h-5 w-5 text-secondary-400 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          <button
            onClick={() => setLoginMode('company')}
            className="w-full group relative flex items-center gap-4 rounded-xl border-2 border-secondary-200 dark:border-secondary-700 p-5 text-left transition-all duration-200 hover:border-primary-500 dark:hover:border-primary-400 hover:shadow-lg hover:shadow-primary-500/10"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/40">
              <BuildingOffice2Icon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Company Login</h3>
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Admin, Manager, or Employee access</p>
            </div>
            <svg className="h-5 w-5 text-secondary-400 group-hover:text-primary-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Login form (both Super Admin and Company)
  const isSuperAdmin = loginMode === 'super-admin';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => { setLoginMode('select'); loginForm.reset(); }}
          className="flex items-center justify-center h-8 w-8 rounded-lg bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-secondary-900 dark:text-white">
            {isSuperAdmin ? 'Super Admin Login' : 'Company Login'}
          </h2>
          <p className="text-sm text-secondary-500 dark:text-secondary-400">
            {isSuperAdmin ? 'Sign in to the platform administration console' : 'Sign in to access your organization\u2019s PMS'}
          </p>
        </div>
      </div>

      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium mb-6 ${
        isSuperAdmin
          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800'
          : 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-1 ring-primary-200 dark:ring-primary-800'
      }`}>
        {isSuperAdmin ? <ShieldCheckIcon className="h-3.5 w-3.5" /> : <BuildingOffice2Icon className="h-3.5 w-3.5" />}
        {isSuperAdmin ? 'Platform Administrator' : 'Organization Access'}
      </div>

      <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
        <div>
          <label htmlFor="email" className="label">Email address</label>
          <input
            type="email"
            id="email"
            {...loginForm.register('email', {
              required: 'Email is required',
              pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email address' },
            })}
            className="input"
            placeholder={isSuperAdmin ? 'admin@pms-platform.com' : 'you@company.com'}
            autoComplete="email"
            autoFocus
          />
          {loginForm.formState.errors.email && (
            <p className="mt-1 text-sm text-danger-600">{loginForm.formState.errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              {...loginForm.register('password', { required: 'Password is required' })}
              className="input pr-10"
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-secondary-400 hover:text-secondary-600"
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
          {loginForm.formState.errors.password && (
            <p className="mt-1 text-sm text-danger-600">{loginForm.formState.errors.password.message}</p>
          )}
        </div>

        {!isSuperAdmin && (
          <div>
            <label htmlFor="tenantSlug" className="label">
              Organization ID <span className="text-secondary-400 text-xs font-normal">(optional)</span>
            </label>
            <input
              type="text"
              id="tenantSlug"
              {...loginForm.register('tenantSlug')}
              className="input"
              placeholder="e.g. acme-corp"
            />
            <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
              Enter your organization identifier if provided by your admin.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input type="checkbox" className="h-4 w-4 text-primary-600 border-secondary-300 dark:border-secondary-600 rounded focus:ring-primary-500 dark:bg-secondary-800" />
            <span className="ml-2 text-sm text-secondary-600 dark:text-secondary-400">Remember me</span>
          </label>
          {!isSuperAdmin && (
            <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
              Forgot password?
            </Link>
          )}
        </div>

        <button type="submit" disabled={isLoading} className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
          isSuperAdmin
            ? 'bg-indigo-600 hover:bg-indigo-700 focus-visible:outline-indigo-600'
            : 'bg-primary-600 hover:bg-primary-700 focus-visible:outline-primary-600'
        }`}>
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in...
            </span>
          ) : (
            <>
              {isSuperAdmin && <ShieldCheckIcon className="h-4 w-4" />}
              {isSuperAdmin ? 'Sign in as Super Admin' : 'Sign in'}
            </>
          )}
        </button>
      </form>

      {!isSuperAdmin && (
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-secondary-200 dark:border-secondary-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white dark:bg-secondary-950 px-4 text-secondary-500 dark:text-secondary-400">Or continue with</span>
            </div>
          </div>
          <div className="mt-6">
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => toast('SSO is available for Enterprise plan tenants. Contact your organization administrator.')}
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google SSO
              <span className="ml-1 text-xs text-secondary-400">(Enterprise)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
