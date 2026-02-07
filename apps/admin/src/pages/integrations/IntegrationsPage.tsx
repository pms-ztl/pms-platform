import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { integrationsApi } from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  PuzzlePieceIcon,
  CheckCircleIcon,
  XCircleIcon,
  CogIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

interface Integration {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  connectedTenants: number;
  description: string;
  icon: string;
}

const integrationIcons: Record<string, string> = {
  workday: 'W',
  sap: 'S',
  bamboohr: 'B',
  adp: 'A',
  slack: 'S',
  teams: 'T',
  jira: 'J',
  asana: 'A',
  google: 'G',
  outlook: 'O',
  okta: 'O',
  azure: 'A',
};

export default function IntegrationsPage() {
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(
    null
  );
  const queryClient = useQueryClient();

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.list(),
  });

  const enableMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.enable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integration enabled');
    },
  });

  const disableMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.disable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integration disabled');
    },
  });

  // Mock integrations data
  const mockIntegrations: Integration[] = [
    {
      id: 'workday',
      name: 'Workday',
      type: 'hris',
      status: 'active',
      connectedTenants: 45,
      description: 'Sync employee data from Workday HCM',
      icon: 'workday',
    },
    {
      id: 'sap',
      name: 'SAP SuccessFactors',
      type: 'hris',
      status: 'active',
      connectedTenants: 32,
      description: 'Integration with SAP SuccessFactors',
      icon: 'sap',
    },
    {
      id: 'bamboohr',
      name: 'BambooHR',
      type: 'hris',
      status: 'active',
      connectedTenants: 78,
      description: 'Sync employees and org structure from BambooHR',
      icon: 'bamboohr',
    },
    {
      id: 'slack',
      name: 'Slack',
      type: 'communication',
      status: 'active',
      connectedTenants: 120,
      description: 'Send notifications and updates to Slack channels',
      icon: 'slack',
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      type: 'communication',
      status: 'active',
      connectedTenants: 95,
      description: 'Teams integration for notifications and collaboration',
      icon: 'teams',
    },
    {
      id: 'jira',
      name: 'Jira',
      type: 'project',
      status: 'active',
      connectedTenants: 56,
      description: 'Link goals and tasks with Jira issues',
      icon: 'jira',
    },
    {
      id: 'okta',
      name: 'Okta',
      type: 'sso',
      status: 'active',
      connectedTenants: 85,
      description: 'Single sign-on with Okta',
      icon: 'okta',
    },
    {
      id: 'azure',
      name: 'Azure AD',
      type: 'sso',
      status: 'active',
      connectedTenants: 110,
      description: 'Azure Active Directory SSO integration',
      icon: 'azure',
    },
    {
      id: 'google',
      name: 'Google Calendar',
      type: 'calendar',
      status: 'active',
      connectedTenants: 145,
      description: 'Sync review meetings with Google Calendar',
      icon: 'google',
    },
    {
      id: 'outlook',
      name: 'Outlook Calendar',
      type: 'calendar',
      status: 'active',
      connectedTenants: 130,
      description: 'Sync review meetings with Outlook Calendar',
      icon: 'outlook',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-success-600';
      case 'inactive':
        return 'text-gray-400';
      case 'error':
        return 'text-danger-600';
      default:
        return 'text-gray-400';
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      hris: 'HRIS',
      communication: 'Communication',
      project: 'Project Management',
      sso: 'Single Sign-On',
      calendar: 'Calendar',
    };
    return labels[type] || type;
  };

  const categories = [
    { id: 'hris', name: 'HRIS Systems' },
    { id: 'communication', name: 'Communication' },
    { id: 'project', name: 'Project Management' },
    { id: 'sso', name: 'Identity & SSO' },
    { id: 'calendar', name: 'Calendar' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage system-wide integration configurations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-success-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {mockIntegrations.filter((i) => i.status === 'active').length}
              </p>
              <p className="text-sm text-gray-500">Active Integrations</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary-100 rounded-lg">
              <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {mockIntegrations.reduce((sum, i) => sum + i.connectedTenants, 0)}
              </p>
              <p className="text-sm text-gray-500">Total Connections</p>
            </div>
          </div>
        </div>
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <PuzzlePieceIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">
                {mockIntegrations.length}
              </p>
              <p className="text-sm text-gray-500">Available Integrations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Integration Categories */}
      {categories.map((category) => {
        const categoryIntegrations = mockIntegrations.filter(
          (i) => i.type === category.id
        );
        if (categoryIntegrations.length === 0) return null;

        return (
          <div key={category.id} className="card overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {categoryIntegrations.map((integration) => (
                <div
                  key={integration.id}
                  className="p-6 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600">
                      {integrationIcons[integration.icon] || integration.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {integration.name}
                        </h4>
                        {integration.status === 'active' ? (
                          <CheckCircleIcon className="h-5 w-5 text-success-500" />
                        ) : integration.status === 'error' ? (
                          <XCircleIcon className="h-5 w-5 text-danger-500" />
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-500">{integration.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {integration.connectedTenants}
                      </p>
                      <p className="text-xs text-gray-500">connected tenants</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedIntegration(integration)}
                        className="btn btn-secondary"
                      >
                        <CogIcon className="h-4 w-4 mr-1" />
                        Configure
                      </button>
                      {integration.status === 'active' ? (
                        <button
                          onClick={() => disableMutation.mutate(integration.id)}
                          className="btn btn-secondary text-danger-600 hover:text-danger-700"
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          onClick={() => enableMutation.mutate(integration.id)}
                          className="btn btn-primary"
                        >
                          Enable
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Configuration Modal */}
      {selectedIntegration && (
        <ConfigModal
          integration={selectedIntegration}
          onClose={() => setSelectedIntegration(null)}
        />
      )}
    </div>
  );
}

function ConfigModal({
  integration,
  onClose,
}: {
  integration: Integration;
  onClose: () => void;
}) {
  const [config, setConfig] = useState({
    apiKey: '',
    apiSecret: '',
    webhookUrl: '',
    syncInterval: '60',
  });

  const handleSave = () => {
    toast.success('Configuration saved');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Configure {integration.name}
        </h2>
        <p className="text-sm text-gray-500 mb-6">{integration.description}</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              className="input"
              placeholder="Enter API key"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Secret
            </label>
            <input
              type="password"
              value={config.apiSecret}
              onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
              className="input"
              placeholder="Enter API secret"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Webhook URL
            </label>
            <input
              type="url"
              value={config.webhookUrl}
              onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
              className="input"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sync Interval (minutes)
            </label>
            <select
              value={config.syncInterval}
              onChange={(e) =>
                setConfig({ ...config, syncInterval: e.target.value })
              }
              className="input"
            >
              <option value="15">Every 15 minutes</option>
              <option value="30">Every 30 minutes</option>
              <option value="60">Every hour</option>
              <option value="360">Every 6 hours</option>
              <option value="1440">Every 24 hours</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
