import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EnvelopeIcon,
  KeyIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { authApi } from '@/lib/api';

type Step = 'email' | 'reset' | 'success';

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authApi.forgotPassword(email.trim());
      setMessage('If an account exists with this email, a password reset code has been sent.');
      setStep('reset');
    } catch (err: any) {
      // API always returns success to prevent email enumeration
      setMessage('If an account exists with this email, a password reset code has been sent.');
      setStep('reset');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Please enter the reset token from your email');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
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
      await authApi.resetPassword(token.trim(), password);
      setStep('success');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid or expired reset token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Logo + Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-cyan-500 mb-4 shadow-lg">
          <KeyIcon className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
          {step === 'email' && 'Forgot Password'}
          {step === 'reset' && 'Reset Password'}
          {step === 'success' && 'Password Reset!'}
        </h1>
        <p className="mt-2 text-secondary-600 dark:text-secondary-400">
          {step === 'email' && 'Enter your email to receive a reset code'}
          {step === 'reset' && 'Enter the code from your email and your new password'}
          {step === 'success' && 'Your password has been successfully changed'}
        </p>
      </div>

      {/* Step 1: Email */}
      {step === 'email' && (
        <form onSubmit={handleRequestReset} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Email address
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input pl-10"
                autoFocus
                required
              />
            </div>
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
              <>Send Reset Code</>
            )}
          </button>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        </form>
      )}

      {/* Step 2: Enter token + new password */}
      {step === 'reset' && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          {message && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm">
              <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
              {message}
            </div>
          )}

          <div>
            <label htmlFor="token" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Reset Token
            </label>
            <input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the full token from your email"
              className="input font-mono text-sm"
              autoFocus
              required
            />
            <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
              Check your email ({email}) for the reset token
            </p>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="input"
              minLength={8}
              required
            />
            <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
              Must include, lowercase, number, and special character
            </p>
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
              placeholder="Re-enter your new password"
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
              <>Reset Password</>
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setStep('email'); setError(''); setMessage(''); }}
              className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Try a different email
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Success */}
      {step === 'success' && (
        <div className="text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>

          <p className="text-secondary-600 dark:text-secondary-400">
            Your password has been updated. You can now sign in with your new password.
          </p>

          <Link
            to="/login"
            className="btn btn-primary inline-flex items-center gap-2"
          >
            Go to Sign In
          </Link>
        </div>
      )}
    </div>
  );
}
