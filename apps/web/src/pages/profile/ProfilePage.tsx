import { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserCircleIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  KeyIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  ClockIcon,
  CheckBadgeIcon,
  CameraIcon,
  PhotoIcon,
  SparklesIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';

import { authApi, goalsApi, reviewsApi, feedbackApi, usersApi, getAvatarUrl, type Goal } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { EmployeeCard } from '@/components/employee-card';
import { usePageTitle } from '@/hooks/usePageTitle';

// AI Avatar options using DiceBear API
const AI_AVATARS = [
  { name: 'Bottts', url: (seed: string) => `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}` },
  { name: 'Avataaars', url: (seed: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}` },
  { name: 'Fun Emoji', url: (seed: string) => `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed}` },
  { name: 'Lorelei', url: (seed: string) => `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed}` },
  { name: 'Notionists', url: (seed: string) => `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}` },
  { name: 'Personas', url: (seed: string) => `https://api.dicebear.com/7.x/personas/svg?seed=${seed}` },
];

export function ProfilePage() {
  usePageTitle('Profile');
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'activity'>('overview');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaSecret, setMfaSecret] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showEmployeeCardModal, setShowEmployeeCardModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: myGoals } = useQuery({
    queryKey: ['goals', 'my'],
    queryFn: () => goalsApi.getMyGoals({ status: 'ACTIVE' }),
  });

  const { data: myReviews } = useQuery({
    queryKey: ['reviews', 'my', 'recent'],
    queryFn: () => reviewsApi.listMyReviews({ asReviewee: true }),
  });

  const { data: receivedFeedback } = useQuery({
    queryKey: ['feedback', 'received', 'recent'],
    queryFn: () => feedbackApi.listReceived({ limit: 5 }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setShowChangePasswordModal(false);
      toast.success('Password changed successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to change password');
    },
  });

  const setupMfaMutation = useMutation({
    mutationFn: () => authApi.setupMfa(),
    onSuccess: (data) => {
      setMfaSecret(data);
      setShowMfaModal(true);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to setup MFA');
    },
  });

  const verifyMfaMutation = useMutation({
    mutationFn: (code: string) => authApi.verifyMfaSetup(code),
    onSuccess: async () => {
      setShowMfaModal(false);
      setMfaSecret(null);
      toast.success('MFA enabled successfully');
      // Refresh user data so mfaEnabled reflects the new state
      try {
        const updatedUser = await authApi.me();
        if (updatedUser) {
          setUser(updatedUser);
        }
      } catch {
        // Silent fail — user will see updated state on next page load
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Invalid MFA code');
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(file),
    onSuccess: (data) => {
      if (user) {
        setUser({ ...user, avatarUrl: data.avatarUrl });
      }
      setShowAvatarModal(false);
      toast.success('Avatar uploaded successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to upload avatar');
    },
  });

  const setAiAvatarMutation = useMutation({
    mutationFn: (avatarUrl: string) => usersApi.setAiAvatar(avatarUrl),
    onSuccess: (data) => {
      if (user) {
        setUser({ ...user, avatarUrl: data.avatarUrl });
      }
      setShowAvatarModal(false);
      toast.success('AI avatar set successfully');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to set AI avatar');
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
        toast.error('Only JPEG, PNG, GIF, and WebP images are allowed');
        return;
      }
      uploadAvatarMutation.mutate(file);
    }
  };

  const completedGoals = myGoals?.data?.filter((g: Goal) => g.status === 'COMPLETED').length || 0;
  const totalGoals = myGoals?.data?.length || 0;
  const avgProgress = totalGoals > 0
    ? Math.round(myGoals?.data?.reduce((acc: number, g: Goal) => acc + g.progress, 0) / totalGoals)
    : 0;

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <ChartBarIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Goals Progress</p>
              <p className="text-2xl font-semibold text-secondary-900 dark:text-white">{avgProgress}%</p>
              <p className="text-xs text-secondary-400 dark:text-secondary-500">{completedGoals}/{totalGoals} completed</p>
            </div>
          </div>
        </div>
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-success-100 dark:bg-success-900/30">
              <CheckBadgeIcon className="h-6 w-6 text-success-600 dark:text-success-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Reviews Completed</p>
              <p className="text-2xl font-semibold text-secondary-900 dark:text-white">
                {myReviews?.filter((r: any) => r.status === 'ACKNOWLEDGED').length || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-warning-100 dark:bg-warning-900/30">
              <ClockIcon className="h-6 w-6 text-warning-600 dark:text-warning-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-secondary-500 dark:text-secondary-400">Feedback Received</p>
              <p className="text-2xl font-semibold text-secondary-900 dark:text-white">
                {receivedFeedback?.meta?.total || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile details */}
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Profile Information</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-secondary-500 dark:text-secondary-400">Full Name</dt>
            <dd className="mt-1 text-sm text-secondary-900 dark:text-white">{user?.firstName} {user?.lastName}</dd>
          </div>
          <div>
            <dt className="text-sm text-secondary-500 dark:text-secondary-400">Email</dt>
            <dd className="mt-1 text-sm text-secondary-900 dark:text-white">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-secondary-500 dark:text-secondary-400">Job Title</dt>
            <dd className="mt-1 text-sm text-secondary-900 dark:text-white">{user?.jobTitle || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-sm text-secondary-500 dark:text-secondary-400">Department</dt>
            <dd className="mt-1 text-sm text-secondary-900 dark:text-white">{user?.department?.name || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-sm text-secondary-500 dark:text-secondary-400">Manager</dt>
            <dd className="mt-1 text-sm text-secondary-900 dark:text-white">
              {user?.manager ? `${user.manager.firstName} ${user.manager.lastName}` : 'Not set'}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-secondary-500 dark:text-secondary-400">Roles</dt>
            <dd className="mt-1 text-sm text-secondary-900 dark:text-white">
              <div className="flex flex-wrap gap-2">
                {user?.roles?.map((role) => (
                  <span key={role} className="px-2 py-0.5 bg-secondary-100 dark:bg-secondary-700 rounded text-xs text-secondary-900 dark:text-secondary-200">
                    {role}
                  </span>
                ))}
              </div>
            </dd>
          </div>
        </dl>
      </div>

      {/* Recent goals */}
      {myGoals?.data && myGoals.data.length > 0 && (
        <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
          <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Active Goals</h3>
          <div className="space-y-3">
            {myGoals.data.slice(0, 5).map((goal: Goal) => (
              <div key={goal.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-secondary-900 dark:text-white break-words">{goal.title}</p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">{goal.type}</p>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <div className="w-24 bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-primary-500"
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-secondary-500 dark:text-secondary-400 w-8 text-right">{goal.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Password</h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
          Keep your account secure by using a strong, unique password.
        </p>
        <button onClick={() => setShowChangePasswordModal(true)} className="btn-secondary dark:bg-secondary-700 dark:text-white dark:border-secondary-600 dark:hover:bg-secondary-600">
          <KeyIcon className="h-5 w-5 mr-2" />
          Change Password
        </button>
      </div>

      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Two-Factor Authentication</h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
          Add an extra layer of security to your account by enabling two-factor authentication.
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className={clsx('h-5 w-5', user?.mfaEnabled ? 'text-success-500' : 'text-secondary-400 dark:text-secondary-500')} />
            <span className="text-sm text-secondary-700 dark:text-secondary-300">
              {user?.mfaEnabled ? 'MFA is enabled' : 'MFA is not enabled'}
            </span>
          </div>
          {!user?.mfaEnabled && (
            <button
              onClick={() => setupMfaMutation.mutate()}
              disabled={setupMfaMutation.isPending}
              className="btn-primary"
            >
              Enable MFA
            </button>
          )}
        </div>
      </div>

      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Active Sessions</h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
          You are currently signed in on this device. You can sign out of all other sessions if needed.
        </p>
        <div className="p-3 bg-secondary-50 dark:bg-secondary-900/50 rounded-lg flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-secondary-900 dark:text-white">Current Session</p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">This browser • Active now</p>
          </div>
          <span className="px-2 py-0.5 bg-success-100 dark:bg-success-900/40 text-success-700 dark:text-success-300 rounded text-xs">Active</span>
        </div>
      </div>
    </div>
  );

  const renderActivity = () => (
    <div className="space-y-6">
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {receivedFeedback?.data && receivedFeedback.data.length > 0 ? (
            receivedFeedback.data.map((feedback: any) => (
              <div key={feedback.id} className="flex items-start gap-3 pb-4 border-b border-secondary-100 dark:border-secondary-700 last:border-0 last:pb-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <UserCircleIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p className="text-sm text-secondary-900 dark:text-white">
                    Received {feedback.type.toLowerCase()} feedback
                    {!feedback.isAnonymous && feedback.fromUser && ` from ${feedback.fromUser.firstName}`}
                  </p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                    {format(new Date(feedback.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-secondary-500 dark:text-secondary-400">No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card card-body dark:bg-secondary-800 dark:border-secondary-700">
        <div className="flex items-center gap-6">
          <div className="relative group">
            {user?.avatarUrl ? (
              <img src={getAvatarUrl(user.avatarUrl, 'md') || user.avatarUrl} alt={user.firstName} className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span className="text-2xl font-medium text-primary-700 dark:text-primary-300">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              </div>
            )}
            {/* Avatar edit button overlay */}
            <button
              onClick={() => setShowAvatarModal(true)}
              className="absolute inset-0 w-20 h-20 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <CameraIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-secondary-600 dark:text-secondary-400">{user?.jobTitle || 'Employee'}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-secondary-500 dark:text-secondary-400">
              <span className="flex items-center gap-1">
                <EnvelopeIcon className="h-4 w-4" />
                {user?.email}
              </span>
              {user?.department && (
                <span className="flex items-center gap-1">
                  <BuildingOfficeIcon className="h-4 w-4" />
                  {user.department.name}
                </span>
              )}
            </div>
          </div>
          {/* Employee Card Button */}
          <button
            onClick={() => setShowEmployeeCardModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <IdentificationIcon className="h-5 w-5" />
            Download Employee Card
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Tabs */}
      <div className="border-b border-secondary-200 dark:border-secondary-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'security', label: 'Security' },
            { key: 'activity', label: 'Activity' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={clsx(
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'security' && renderSecurity()}
      {activeTab === 'activity' && renderActivity()}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={() => setShowChangePasswordModal(false)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Change Password</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const newPassword = formData.get('newPassword') as string;
                  const confirmPassword = formData.get('confirmPassword') as string;

                  if (newPassword !== confirmPassword) {
                    toast.error('Passwords do not match');
                    return;
                  }

                  changePasswordMutation.mutate({
                    currentPassword: formData.get('currentPassword') as string,
                    newPassword,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="label dark:text-secondary-300">Current Password</label>
                  <input name="currentPassword" type="password" required className="input dark:bg-secondary-900 dark:border-secondary-700 dark:text-white" />
                </div>
                <div>
                  <label className="label dark:text-secondary-300">New Password</label>
                  <input name="newPassword" type="password" required minLength={8} className="input dark:bg-secondary-900 dark:border-secondary-700 dark:text-white" />
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Confirm New Password</label>
                  <input name="confirmPassword" type="password" required minLength={8} className="input dark:bg-secondary-900 dark:border-secondary-700 dark:text-white" />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowChangePasswordModal(false)} className="btn-secondary dark:bg-secondary-700 dark:text-white dark:border-secondary-600 dark:hover:bg-secondary-600">
                    Cancel
                  </button>
                  <button type="submit" disabled={changePasswordMutation.isPending} className="btn-primary">
                    {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MFA Setup Modal */}
      {showMfaModal && mfaSecret && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={() => setShowMfaModal(false)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Setup Two-Factor Authentication</h2>
              <div className="space-y-4">
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Scan the QR code below with your authenticator app, then enter the verification code.
                </p>
                <div className="flex justify-center">
                  <div className="border border-secondary-200 dark:border-secondary-600 rounded bg-white p-3">
                    <QRCodeSVG
                      value={mfaSecret.otpauthUrl}
                      size={200}
                      level="M"
                    />
                  </div>
                </div>
                <div>
                  <label className="label dark:text-secondary-300">Manual entry code</label>
                  <code className="block p-2 bg-secondary-50 dark:bg-secondary-900 rounded text-sm font-mono break-all text-secondary-900 dark:text-secondary-200">
                    {mfaSecret.secret}
                  </code>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    verifyMfaMutation.mutate(formData.get('code') as string);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="label dark:text-secondary-300">Verification Code</label>
                    <input
                      name="code"
                      type="text"
                      required
                      pattern="\d{6}"
                      maxLength={6}
                      className="input dark:bg-secondary-900 dark:border-secondary-700 dark:text-white"
                      placeholder="000000"
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setShowMfaModal(false)} className="btn-secondary dark:bg-secondary-700 dark:text-white dark:border-secondary-600 dark:hover:bg-secondary-600">
                      Cancel
                    </button>
                    <button type="submit" disabled={verifyMfaMutation.isPending} className="btn-primary">
                      {verifyMfaMutation.isPending ? 'Verifying...' : 'Enable MFA'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Upload Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={() => setShowAvatarModal(false)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-lg w-full p-6">
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-4">Change Profile Photo</h2>

              {/* Upload from PC */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3 flex items-center gap-2">
                  <PhotoIcon className="h-5 w-5" />
                  Upload from your device
                </h3>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-secondary-300 dark:border-secondary-600 rounded-lg p-6 text-center cursor-pointer hover:border-primary-500 transition-colors"
                >
                  <CameraIcon className="h-10 w-10 mx-auto text-secondary-400 dark:text-secondary-500 mb-2" />
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    Click to select an image
                  </p>
                  <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                    JPEG, PNG, GIF, or WebP (max 5MB)
                  </p>
                </div>
                {uploadAvatarMutation.isPending && (
                  <p className="text-sm text-primary-600 dark:text-primary-400 mt-2">Uploading...</p>
                )}
              </div>

              {/* AI Avatars */}
              <div>
                <h3 className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3 flex items-center gap-2">
                  <SparklesIcon className="h-5 w-5" />
                  Choose an AI-generated avatar
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {AI_AVATARS.map((avatar) => {
                    const avatarUrl = avatar.url(user?.email || 'default');
                    return (
                      <button
                        key={avatar.name}
                        onClick={() => setAiAvatarMutation.mutate(avatarUrl)}
                        disabled={setAiAvatarMutation.isPending}
                        className="flex flex-col items-center p-3 rounded-lg border border-secondary-200 dark:border-secondary-700 hover:border-primary-500 dark:hover:border-primary-500 transition-colors disabled:opacity-50"
                      >
                        <img src={avatarUrl} alt={avatar.name} className="w-16 h-16 rounded-full bg-white" />
                        <span className="text-xs text-secondary-600 dark:text-secondary-400 mt-2">{avatar.name}</span>
                      </button>
                    );
                  })}
                </div>
                {setAiAvatarMutation.isPending && (
                  <p className="text-sm text-primary-600 dark:text-primary-400 mt-2">Setting avatar...</p>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={() => setShowAvatarModal(false)}
                  className="btn-secondary dark:bg-secondary-700 dark:text-white dark:border-secondary-600 dark:hover:bg-secondary-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Card Modal */}
      {showEmployeeCardModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={() => setShowEmployeeCardModal(false)} />
            <div className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <EmployeeCard onClose={() => setShowEmployeeCardModal(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
