import { useState, useRef } from 'react';
import { CameraIcon, UserCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useMutation } from '@tanstack/react-query';
import { usersApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import toast from 'react-hot-toast';

interface ProfileStepProps {
  onNext: () => void;
  onSkip: () => void;
}

const DICEBEAR_STYLES = ['avataaars', 'bottts', 'fun-emoji', 'lorelei', 'notionists', 'personas'];

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export function ProfileStep({ onNext, onSkip }: ProfileStepProps) {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  );
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '');
  const [aiAvatarStyle, setAiAvatarStyle] = useState(0);

  const updateMutation = useMutation({
    mutationFn: (data: { displayName?: string; jobTitle?: string; timezone?: string }) =>
      usersApi.update(user!.id, data),
    onSuccess: (updatedUser) => {
      setUser({ ...user!, ...updatedUser, displayName: displayName || user!.displayName, jobTitle: jobTitle || user!.jobTitle });
      toast.success('Profile updated!');
      onNext();
    },
    onError: () => toast.error('Failed to update profile'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(file),
    onSuccess: (result) => {
      setAvatarPreview(result.avatarUrl);
      setUser({ ...user!, avatarUrl: result.avatarUrl });
      toast.success('Avatar uploaded!');
    },
    onError: () => toast.error('Failed to upload avatar'),
  });

  const aiAvatarMutation = useMutation({
    mutationFn: (url: string) => usersApi.setAiAvatar(url),
    onSuccess: (result) => {
      setAvatarPreview(result.avatarUrl);
      setUser({ ...user!, avatarUrl: result.avatarUrl });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }
    uploadMutation.mutate(file);
  };

  const generateAiAvatar = () => {
    const style = DICEBEAR_STYLES[aiAvatarStyle % DICEBEAR_STYLES.length];
    const seed = `${user?.email || 'user'}-${Date.now()}`;
    const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
    setAvatarPreview(url);
    aiAvatarMutation.mutate(url);
    setAiAvatarStyle((prev) => prev + 1);
  };

  const handleSave = () => {
    const data: Record<string, string> = {};
    if (displayName.trim()) data.displayName = displayName.trim();
    if (jobTitle.trim()) data.jobTitle = jobTitle.trim();
    if (timezone) data.timezone = timezone;

    if (Object.keys(data).length === 0) {
      onNext();
      return;
    }
    updateMutation.mutate(data);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-secondary-900 dark:text-white mb-1 text-center">
        Complete Your Profile
      </h2>
      <p className="text-sm text-secondary-500 dark:text-secondary-400 text-center mb-6">
        Help your team get to know you
      </p>

      {/* Avatar Section */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-3">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Avatar"
              className="w-24 h-24 rounded-full object-cover ring-4 ring-primary-100 dark:ring-primary-900/30"
            />
          ) : (
            <UserCircleIcon className="w-24 h-24 text-secondary-300 dark:text-secondary-600" />
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 shadow-lg transition-colors"
          >
            <CameraIcon className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        <button
          onClick={generateAiAvatar}
          disabled={aiAvatarMutation.isPending}
          className="inline-flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
        >
          <ArrowPathIcon className={`h-3.5 w-3.5 ${aiAvatarMutation.isPending ? 'animate-spin' : ''}`} />
          Generate AI Avatar
        </button>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 max-w-sm mx-auto">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={`${user?.firstName} ${user?.lastName}`}
            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Job Title
          </label>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Software Engineer, Product Manager"
            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Timezone
          </label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-8 max-w-sm mx-auto">
        <button
          onClick={onSkip}
          className="text-sm text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300"
        >
          Skip for now
        </button>
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save & Continue'}
        </button>
      </div>
    </div>
  );
}
