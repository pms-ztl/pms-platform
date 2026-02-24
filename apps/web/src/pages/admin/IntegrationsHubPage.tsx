import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  ArrowPathIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  SignalIcon,
  ClockIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { integrationsApi, type IntegrationConnector, type Integration, type SyncHistoryEntry } from '@/lib/api/integrations';
import { usePageTitle } from '@/hooks/usePageTitle';
import { PageHeader } from '@/components/ui';

// ── constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ['HRIS', 'COLLABORATION', 'PRODUCTIVITY', 'CALENDAR', 'IDENTITY'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  HRIS: 'HRIS',
  COLLABORATION: 'Collaboration',
  PRODUCTIVITY: 'Productivity',
  CALENDAR: 'Calendar',
  IDENTITY: 'Identity & SSO',
};

const CONNECTOR_ICONS: Record<string, string> = {
  workday: 'W',
  sap: 'SF',
  bamboohr: 'B',
  adp: 'A',
  slack: 'S',
  teams: 'T',
  jira: 'J',
  asana: 'As',
  'google-calendar': 'GC',
  outlook: 'OL',
  okta: 'Ok',
  'azure-ad': 'Az',
};

const CONNECTOR_COLORS: Record<string, string> = {
  HRIS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  COLLABORATION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  PRODUCTIVITY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  CALENDAR: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  IDENTITY: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const STATUS_CONFIG: Record<string, { color: string; icon: typeof CheckCircleIcon; label: string }> = {
  ACTIVE: { color: 'text-green-600', icon: CheckCircleIcon, label: 'Active' },
  INACTIVE: { color: 'text-secondary-400', icon: ClockIcon, label: 'Inactive' },
  ERROR: { color: 'text-red-500', icon: XCircleIcon, label: 'Error' },
};

// ── component ────────────────────────────────────────────────────────────────

export function IntegrationsHubPage() {
  usePageTitle('Integrations');
  const queryClient = useQueryClient();

  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupConnector, setSetupConnector] = useState<IntegrationConnector | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [setupForm, setSetupForm] = useState<Record<string, string>>({});
  const [setupName, setSetupName] = useState('');

  // ── queries ─────────────────────────────────────────────────────────────

  const { data: connectors = [], isLoading: loadingConnectors } = useQuery({
    queryKey: ['integrations', 'connectors'],
    queryFn: () => integrationsApi.getConnectors(),
    staleTime: 300_000,
  });

  const { data: integrationsRaw, isLoading: loadingIntegrations } = useQuery({
    queryKey: ['integrations', 'list'],
    queryFn: () => integrationsApi.list(),
    staleTime: 60_000,
  });

  const integrations: Integration[] = useMemo(() => {
    return Array.isArray(integrationsRaw) ? integrationsRaw : (integrationsRaw as any)?.data ?? [];
  }, [integrationsRaw]);

  const { data: syncHistoryRaw } = useQuery({
    queryKey: ['integrations', 'sync-history', selectedIntegration],
    queryFn: () => (selectedIntegration ? integrationsApi.getSyncHistory(selectedIntegration) : Promise.resolve([])),
    enabled: !!selectedIntegration,
    staleTime: 30_000,
  });

  const syncHistory: SyncHistoryEntry[] = useMemo(() => {
    return Array.isArray(syncHistoryRaw) ? syncHistoryRaw : (syncHistoryRaw as any)?.data ?? [];
  }, [syncHistoryRaw]);

  const isLoading = loadingConnectors || loadingIntegrations;

  // ── mutations ───────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: { type: string; name: string; config: Record<string, any> }) =>
      integrationsApi.create(data),
    onSuccess: () => {
      toast.success('Integration created');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      setShowSetupModal(false);
      setSetupConnector(null);
      setSetupForm({});
      setSetupName('');
    },
    onError: () => toast.error('Failed to create integration'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.delete(id),
    onSuccess: () => {
      toast.success('Integration removed');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      if (selectedIntegration) setSelectedIntegration(null);
    },
    onError: () => toast.error('Failed to remove integration'),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.testConnection(id),
    onSuccess: (result: any) => {
      if (result?.success) toast.success('Connection successful');
      else toast.error(result?.message || 'Connection test failed');
    },
    onError: () => toast.error('Connection test failed'),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.triggerSync(id),
    onSuccess: () => {
      toast.success('Sync triggered');
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: () => toast.error('Sync failed'),
  });

  // ── derived ─────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const active = integrations.filter((i) => i.status === 'ACTIVE').length;
    const errors = integrations.filter((i) => i.status === 'ERROR').length;
    const lastSync = integrations.reduce((latest, i) => {
      if (i.lastSyncAt && (!latest || new Date(i.lastSyncAt) > new Date(latest))) return i.lastSyncAt;
      return latest;
    }, '' as string);
    return { total: integrations.length, active, errors, lastSync };
  }, [integrations]);

  const filteredConnectors = useMemo(() => {
    const connected = new Set(integrations.map((i) => i.type));
    const available = connectors.filter((c) => !connected.has(c.type));
    if (activeCategory === 'all') return available;
    return available.filter((c) => c.category === activeCategory);
  }, [connectors, integrations, activeCategory]);

  // ── handlers ────────────────────────────────────────────────────────────

  const handleConnect = (connector: IntegrationConnector) => {
    setSetupConnector(connector);
    setSetupName(connector.name);
    setSetupForm({});
    setShowSetupModal(true);
  };

  const handleSubmitSetup = () => {
    if (!setupConnector || !setupName.trim()) return;
    createMutation.mutate({ type: setupConnector.type, name: setupName, config: setupForm });
  };

  // ── skeleton ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-64 rounded bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-secondary-200 dark:bg-secondary-700 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <PageHeader title="Integrations Hub" subtitle="Connect your HRIS, productivity, and collaboration tools" />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Integrations', value: stats.total, color: 'text-indigo-600' },
          { label: 'Active', value: stats.active, color: 'text-green-600' },
          { label: 'Errors', value: stats.errors, color: stats.errors > 0 ? 'text-red-500' : 'text-secondary-400' },
          { label: 'Last Sync', value: stats.lastSync ? new Date(stats.lastSync).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Never', color: 'text-purple-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-4">
            <p className="text-xs text-secondary-500 dark:text-secondary-400">{s.label}</p>
            <p className={clsx('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Active integrations */}
      {integrations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">Connected Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((intg) => {
              const sc = STATUS_CONFIG[intg.status] || STATUS_CONFIG.INACTIVE;
              const StatusIcon = sc.icon;
              return (
                <div
                  key={intg.id}
                  className={clsx(
                    'bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-5 transition-shadow hover:shadow-md cursor-pointer',
                    selectedIntegration === intg.id && 'ring-2 ring-indigo-500',
                  )}
                  onClick={() => setSelectedIntegration(selectedIntegration === intg.id ? null : intg.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary-100 dark:bg-secondary-700 flex items-center justify-center text-sm font-bold text-secondary-600 dark:text-secondary-300">
                        {CONNECTOR_ICONS[connectors.find((c) => c.type === intg.type)?.icon || ''] || intg.type.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-secondary-900 dark:text-white text-sm">{intg.name}</p>
                        <p className="text-2xs text-secondary-400">{intg.type.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    <div className={clsx('flex items-center gap-1 text-xs', sc.color)}>
                      <StatusIcon className="w-4 h-4" />
                      <span>{sc.label}</span>
                    </div>
                  </div>
                  {intg.lastSyncAt && (
                    <p className="text-2xs text-secondary-400 mt-3">
                      Last sync: {new Date(intg.lastSyncAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-secondary-100 dark:border-secondary-700">
                    <button
                      onClick={(e) => { e.stopPropagation(); testMutation.mutate(intg.id); }}
                      className="text-2xs px-2 py-1 rounded bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-600 transition-colors"
                    >
                      <SignalIcon className="w-3 h-3 inline mr-0.5" />Test
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); syncMutation.mutate(intg.id); }}
                      className="text-2xs px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                    >
                      <ArrowPathIcon className="w-3 h-3 inline mr-0.5" />Sync
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(intg.id); }}
                      className="text-2xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors ml-auto"
                    >
                      <TrashIcon className="w-3 h-3 inline mr-0.5" />Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sync history */}
      {selectedIntegration && syncHistory.length > 0 && (
        <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-6">
          <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Sync History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-secondary-200/60 dark:border-white/[0.06]">
                  {['Status', 'Started', 'Processed', 'Created', 'Updated', 'Failed'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-secondary-500 dark:text-secondary-400 pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {syncHistory.slice(0, 10).map((entry) => (
                  <tr key={entry.id} className="border-b border-secondary-100 dark:border-secondary-700/50 last:border-0">
                    <td className="py-2 pr-4">
                      <span className={clsx(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium',
                        entry.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        entry.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      )}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-secondary-600 dark:text-secondary-300">
                      {new Date(entry.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </td>
                    <td className="py-2 pr-4 text-xs text-secondary-900 dark:text-white font-medium">{entry.recordsProcessed}</td>
                    <td className="py-2 pr-4 text-xs text-green-600">{entry.recordsCreated}</td>
                    <td className="py-2 pr-4 text-xs text-blue-600">{entry.recordsUpdated}</td>
                    <td className="py-2 pr-4 text-xs text-red-500">{entry.recordsFailed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Available connectors catalog */}
      <div>
        <h2 className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">Available Connectors</h2>
        {/* Category tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={clsx(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap',
              activeCategory === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-600',
            )}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap',
                activeCategory === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-secondary-100 dark:bg-secondary-700 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-600',
              )}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {filteredConnectors.length === 0 ? (
          <div className="rounded-xl border border-secondary-200/60 dark:border-white/[0.06] bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl p-12 text-center">
            <p className="text-secondary-400 text-sm">
              {integrations.length > 0 ? 'All connectors in this category are already connected.' : 'No connectors available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConnectors.map((connector) => (
              <div key={connector.type} className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-xl shadow-sm border border-secondary-200/60 dark:border-white/[0.06] p-5">
                <div className="flex items-start gap-3">
                  <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold', CONNECTOR_COLORS[connector.category] || 'bg-secondary-100 text-secondary-600')}>
                    {CONNECTOR_ICONS[connector.icon] || connector.type.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-secondary-900 dark:text-white text-sm">{connector.name}</p>
                    <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{connector.description}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {connector.capabilities.map((cap) => (
                    <span key={cap} className="inline-flex items-center rounded-full bg-secondary-100 dark:bg-secondary-700 px-2 py-0.5 text-2xs text-secondary-600 dark:text-secondary-400">
                      {cap.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => handleConnect(connector)}
                  className="mt-3 w-full flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Connect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Setup modal */}
      {showSetupModal && setupConnector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-secondary-800/70 backdrop-blur-xl rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-secondary-200/60 dark:border-white/[0.06]">
              <div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-white">Connect {setupConnector.name}</h3>
                <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">{CATEGORY_LABELS[setupConnector.category]}</p>
              </div>
              <button onClick={() => setShowSetupModal(false)} className="text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">Integration Name</label>
                <input
                  type="text"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. Production Workday"
                />
              </div>
              {setupConnector.requiredFields.map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                  </label>
                  <input
                    type={field.toLowerCase().includes('secret') || field.toLowerCase().includes('key') || field.toLowerCase().includes('token') ? 'password' : 'text'}
                    value={setupForm[field] || ''}
                    onChange={(e) => setSetupForm((prev) => ({ ...prev, [field]: e.target.value }))}
                    className="w-full rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-700 px-3 py-2 text-sm text-secondary-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder={`Enter ${field}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-secondary-200/60 dark:border-white/[0.06]">
              <button
                onClick={() => setShowSetupModal(false)}
                className="px-4 py-2 text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitSetup}
                disabled={createMutation.isPending || !setupName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {createMutation.isPending ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
