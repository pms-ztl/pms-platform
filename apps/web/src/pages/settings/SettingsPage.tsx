import { useState } from 'react';
import {
  BellIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  LinkIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';

import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { usePageTitle } from '@/hooks/usePageTitle';

type SettingsTab = 'notifications' | 'appearance' | 'integrations' | 'privacy' | 'organization';

export function SettingsPage() {
  usePageTitle('Settings');
  const { user } = useAuthStore();
  const { theme, setTheme, compactMode, setCompactMode, animationsEnabled, setAnimationsEnabled } = useThemeStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('notifications');

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    emailReviewReminders: true,
    emailFeedbackReceived: true,
    emailGoalUpdates: false,
    emailWeeklySummary: true,
    pushReviewReminders: true,
    pushFeedbackReceived: true,
    pushMentions: true,
    inAppAll: true,
  });

  // Privacy settings state
  const [privacySettings, setPrivacySettings] = useState({
    showProfileToTeam: true,
    showGoalsToTeam: true,
    allowAnonymousFeedback: true,
  });

  const isAdmin = user?.roles?.includes('ADMIN') || user?.roles?.includes('HR_ADMIN');

  const tabs = [
    { key: 'notifications', label: 'Notifications', icon: BellIcon },
    { key: 'appearance', label: 'Appearance', icon: PaintBrushIcon },
    { key: 'privacy', label: 'Privacy', icon: ShieldCheckIcon },
    { key: 'integrations', label: 'Integrations', icon: LinkIcon },
    ...(isAdmin ? [{ key: 'organization', label: 'Organization', icon: BuildingOfficeIcon }] : []),
  ];

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  const renderNotifications = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Email Notifications</h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">Choose what emails you'd like to receive.</p>
        <div className="space-y-4">
          {[
            { key: 'emailReviewReminders', label: 'Review reminders', description: 'Get reminded when reviews are due' },
            { key: 'emailFeedbackReceived', label: 'Feedback received', description: 'When someone gives you feedback' },
            { key: 'emailGoalUpdates', label: 'Goal updates', description: 'When your goals are updated or completed' },
            { key: 'emailWeeklySummary', label: 'Weekly summary', description: 'A weekly digest of your performance' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-900 dark:text-white">{item.label}</p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings[item.key as keyof typeof notificationSettings]}
                  onChange={(e) =>
                    setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 dark:bg-secondary-700 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 dark:after:border-secondary-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Push Notifications</h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">Choose what push notifications you'd like to receive.</p>
        <div className="space-y-4">
          {[
            { key: 'pushReviewReminders', label: 'Review reminders', description: 'Get reminded when reviews are due' },
            { key: 'pushFeedbackReceived', label: 'Feedback received', description: 'When someone gives you feedback' },
            { key: 'pushMentions', label: 'Mentions', description: 'When someone mentions you in a comment' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-900 dark:text-white">{item.label}</p>
                <p className="text-xs text-secondary-500 dark:text-secondary-400">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings[item.key as keyof typeof notificationSettings]}
                  onChange={(e) =>
                    setNotificationSettings({ ...notificationSettings, [item.key]: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 dark:bg-secondary-700 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 dark:after:border-secondary-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const themeOptions: { key: typeof theme; label: string; description: string; previewStyle: React.CSSProperties }[] = [
    { key: 'light',     label: 'Light',      description: 'Clean white backgrounds',   previewStyle: { backgroundColor: '#ffffff', border: '1px solid #d1d5db' } },
    { key: 'dark',      label: 'Dark',        description: 'Easy on the eyes',          previewStyle: { backgroundColor: '#1e293b' } },
    { key: 'deep-dark', label: 'Deep Dark',   description: 'Pure black, high contrast', previewStyle: { backgroundColor: '#000000', border: '1px solid #22d3ee', boxShadow: '0 0 8px rgba(6,182,212,0.3)' } },
    { key: 'system',    label: 'System',      description: 'Follows OS preference',     previewStyle: { background: 'linear-gradient(to right, #ffffff, #1e293b)' } },
  ];

  const renderAppearance = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Theme</h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">Choose how the application looks.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {themeOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setTheme(opt.key)}
              className={clsx(
                'p-4 border rounded-xl text-center transition-all duration-200',
                theme === opt.key
                  ? 'border-primary-500 ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600'
              )}
            >
              <div className="w-12 h-8 mx-auto rounded mb-2" style={opt.previewStyle} />
              <p className="text-sm font-medium text-secondary-900 dark:text-white">{opt.label}</p>
              <p className="text-[10px] text-secondary-400 dark:text-secondary-500 mt-0.5">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Display</h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">Customize your display preferences.</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-900 dark:text-white">Compact mode</p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Show more content with less spacing</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={compactMode}
                onChange={(e) => setCompactMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-secondary-200 dark:bg-secondary-700 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 dark:after:border-secondary-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-900 dark:text-white">Animations</p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Enable smooth transitions and animations</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={animationsEnabled}
                onChange={(e) => setAnimationsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-secondary-200 dark:bg-secondary-700 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 dark:after:border-secondary-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Profile Visibility</h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">Control who can see your information.</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-900 dark:text-white">Show profile to team</p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Let team members see your profile details</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacySettings.showProfileToTeam}
                onChange={(e) =>
                  setPrivacySettings({ ...privacySettings, showProfileToTeam: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-secondary-200 dark:bg-secondary-700 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 dark:after:border-secondary-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-900 dark:text-white">Show goals to team</p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Let team members see your goals and progress</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacySettings.showGoalsToTeam}
                onChange={(e) =>
                  setPrivacySettings({ ...privacySettings, showGoalsToTeam: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-secondary-200 dark:bg-secondary-700 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 dark:after:border-secondary-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Feedback Settings</h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">Control how you receive feedback.</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-900 dark:text-white">Allow anonymous feedback</p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Let colleagues send you anonymous feedback</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={privacySettings.allowAnonymousFeedback}
                onChange={(e) =>
                  setPrivacySettings({ ...privacySettings, allowAnonymousFeedback: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-secondary-200 dark:bg-secondary-700 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 dark:after:border-secondary-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Connected Apps</h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">Manage your connected applications and services.</p>
        <div className="space-y-4">
          {[
            { name: 'Slack', description: 'Receive notifications in Slack', connected: false, icon: '💬' },
            { name: 'Microsoft Teams', description: 'Receive notifications in Teams', connected: false, icon: '💼' },
            { name: 'Google Calendar', description: 'Sync 1-on-1 meetings', connected: true, icon: '📅' },
            { name: 'Outlook Calendar', description: 'Sync 1-on-1 meetings', connected: false, icon: '📆' },
          ].map((integration) => (
            <div key={integration.name} className="flex items-center justify-between p-4 border border-secondary-200 dark:border-secondary-700 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-secondary-100 dark:bg-secondary-800 rounded-lg flex items-center justify-center text-xl">
                  {integration.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-secondary-900 dark:text-white">{integration.name}</p>
                  <p className="text-xs text-secondary-500 dark:text-secondary-400">{integration.description}</p>
                </div>
              </div>
              <button
                className={clsx(
                  'px-4 py-2 text-sm font-medium rounded-lg',
                  integration.connected
                    ? 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 dark:bg-secondary-800 dark:text-secondary-300 dark:hover:bg-secondary-700'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                )}
              >
                {integration.connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderOrganization = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Organization Settings</h3>
        <p className="text-sm text-secondary-500 dark:text-secondary-400 mb-4">
          Configure organization-wide settings (Admin only).
        </p>
        <div className="p-4 bg-warning-50 dark:bg-warning-900/30 border border-warning-200 dark:border-warning-800 rounded-lg">
          <p className="text-sm text-warning-700 dark:text-warning-300">
            These settings affect all users in your organization. Changes take effect immediately.
          </p>
        </div>
      </div>

      <div className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Review Cycle Defaults</h3>
        <div className="space-y-4 mt-4">
          <div>
            <label className="label">Default review frequency</label>
            <select className="input">
              <option value="annual">Annual</option>
              <option value="semi-annual">Semi-annual</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
          <div>
            <label className="label">Self-review required</label>
            <select className="input">
              <option value="yes">Yes, always required</option>
              <option value="optional">Optional</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
        <h3 className="text-lg font-medium text-secondary-900 dark:text-white">Goal Settings</h3>
        <div className="space-y-4 mt-4">
          <div>
            <label className="label">Goal alignment required</label>
            <select className="input">
              <option value="required">Required for all goals</option>
              <option value="recommended">Recommended</option>
              <option value="optional">Optional</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-900 dark:text-white">Enable OKRs</p>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Allow OKR-style goal tracking</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-secondary-200 dark:bg-secondary-700 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 dark:after:border-secondary-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-secondary-600 dark:text-secondary-400">Manage your account settings and preferences</p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as SettingsTab)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    activeTab === tab.key
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-secondary-600 hover:bg-secondary-50 dark:text-secondary-400 dark:hover:bg-secondary-800 dark:hover:text-secondary-200'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 card card-body">
          {activeTab === 'notifications' && renderNotifications()}
          {activeTab === 'appearance' && renderAppearance()}
          {activeTab === 'privacy' && renderPrivacy()}
          {activeTab === 'integrations' && renderIntegrations()}
          {activeTab === 'organization' && renderOrganization()}

          <div className="border-t border-secondary-200 dark:border-secondary-700 mt-6 pt-6 flex justify-end gap-3">
            <button className="btn-secondary">Reset to Defaults</button>
            <button onClick={handleSave} className="btn-primary">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
