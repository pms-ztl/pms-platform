import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../lib/api';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon, SparklesIcon } from '@heroicons/react/24/outline';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await authApi.login(data.email, data.password);

      if (response.data.user.role !== 'SUPER_ADMIN' && response.data.user.role !== 'SYSTEM_ADMIN') {
        toast.error('Access denied. Admin privileges required.');
        return;
      }

      login(
        {
          id: response.data.user.id,
          email: response.data.user.email,
          firstName: response.data.user.firstName,
          lastName: response.data.user.lastName,
          role: response.data.user.role as 'SUPER_ADMIN' | 'SYSTEM_ADMIN',
        },
        response.data.token
      );

      toast.success('Command Center activated.');
      navigate('/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { requiresMfa?: boolean; message?: string } } };
      if (err.response?.data?.requiresMfa) {
        setShowMfa(true);
      } else {
        toast.error(err.response?.data?.message || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    setLoading(true);
    try {
      const response = await authApi.verifyMfa(mfaCode);
      if (response.data.verified) {
        navigate('/dashboard');
      }
    } catch {
      toast.error('Invalid MFA code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.12]"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)',
            animation: 'meshFloat1 20s ease-in-out infinite',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.1]"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)',
            animation: 'meshFloat2 25s ease-in-out infinite',
            filter: 'blur(80px)',
          }}
        />
      </div>

      <div className="max-w-md w-full animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 bg-white/[0.08] border border-white/[0.1]">
            <ShieldCheckIcon className="h-8 w-8 text-white/70" />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <SparklesIcon className="h-5 w-5 text-white/50" />
            <h1 className="text-3xl font-bold text-white">PMS Suite</h1>
          </div>
          <p className="mt-2 text-white/40">Command Center · Admin Access</p>
        </div>

        <div className="glass-card">
          {!showMfa ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-white/50">
                  Email address
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="input mt-1"
                  placeholder="admin@company.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white/50">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-white/50">
                  Enter the verification code from your authenticator app
                </p>
              </div>

              <div>
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="input text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <button
                onClick={handleMfaVerify}
                disabled={loading || mfaCode.length !== 6}
                className="btn btn-primary w-full py-3"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>

              <button
                onClick={() => setShowMfa(false)}
                className="btn btn-secondary w-full"
              >
                Back to login
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-white/25">
          Restricted area · Unauthorized access is prohibited
        </p>
      </div>
    </div>
  );
}
