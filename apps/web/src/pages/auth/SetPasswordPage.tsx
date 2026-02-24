import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  KeyIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { authApi } from '@/lib/api';

export function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing setup token. Please use the link from your welcome email.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!passwordRegex.test(password)) {
      setError('Password must contain, lowercase, number, and special character (@$!%*?&)');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.setInitialPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid or expired token. Please contact your administrator.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 mb-4">
          <ExclamationCircleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">Invalid Link</h1>
        <p className="text-secondary-600 dark:text-secondary-400 mb-6">
          This password setup link is invalid or missing required information. Please use the link from your welcome email.
        </p>
        <Link to="/login" className="btn btn-primary inline-flex items-center gap-2">
          Go to Sign In
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white mb-2">Password Set!</h1>
        <p className="text-secondary-600 dark:text-secondary-400 mb-6">
          Your account is now active. You can sign in with your email and new password.
        </p>
        <Link to="/login" className="btn btn-primary inline-flex items-center gap-2">
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-500 mb-4 shadow-lg">
          <KeyIcon className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Set Your Password</h1>
        <p className="mt-2 text-secondary-600 dark:text-secondary-400">
          Welcome to PMS! Create a secure password to activate your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="input pr-10"
              minLength={8}
              required
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
            >
              {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
          <div className="mt-2 space-y-1">
            <PasswordCheck label="At least 8 characters" met={password.length >= 8} />
            <PasswordCheck label="Uppercase letter" met={/[A-Z]/.test(password)} />
            <PasswordCheck label="Lowercase letter" met={/[a-z]/.test(password)} />
            <PasswordCheck label="Number" met={/\d/.test(password)} />
            <PasswordCheck label="Special character (@$!%*?&)" met={/[@$!%*?&]/.test(password)} />
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            className="input"
            minLength={8}
            required
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
            <ExclamationCircleIcon className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" />
          ) : (
            <>Activate Account</>
          )}
        </button>
      </form>
    </div>
  );
}

function PasswordCheck({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div className={`h-1.5 w-1.5 rounded-full ${met ? 'bg-green-500' : 'bg-secondary-300 dark:bg-secondary-600'}`} />
      <span className={met ? 'text-green-600 dark:text-green-400' : 'text-secondary-500 dark:text-secondary-400'}>
        {label}
      </span>
    </div>
  );
}
