import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { securityApi } from '../../lib/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { format } from 'date-fns';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  LockClosedIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

type TabType = 'overview' | 'threats' | 'blocked' | 'sessions';

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [blockIpModal, setBlockIpModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: threats } = useQuery({
    queryKey: ['security-threats'],
    queryFn: () => securityApi.getThreats(),
  });

  const { data: blockedIps } = useQuery({
    queryKey: ['blocked-ips'],
    queryFn: () => securityApi.getBlockedIps(),
  });

  const { data: sessions } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: () => securityApi.getActiveSessions(),
  });

  const blockIpMutation = useMutation({
    mutationFn: ({ ip, reason }: { ip: string; reason: string }) =>
      securityApi.blockIp(ip, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      toast.success('IP address blocked');
      setBlockIpModal(false);
    },
  });

  const unblockIpMutation = useMutation({
    mutationFn: (ip: string) => securityApi.unblockIp(ip),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });
      toast.success('IP address unblocked');
    },
  });

  const terminateSessionMutation = useMutation({
    mutationFn: (sessionId: string) => securityApi.terminateSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-sessions'] });
      toast.success('Session terminated');
    },
  });

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ShieldCheckIcon },
    { id: 'threats', name: 'Threats', icon: ExclamationTriangleIcon },
    { id: 'blocked', name: 'Blocked IPs', icon: NoSymbolIcon },
    { id: 'sessions', name: 'Active Sessions', icon: ComputerDesktopIcon },
  ];

  // Mock security data
  const mockThreats = {
    blocked: 156,
    suspicious: 23,
    recentAttempts: [
      { ip: '192.168.1.100', count: 45, lastAttempt: new Date().toISOString() },
      { ip: '10.0.0.50', count: 32, lastAttempt: new Date().toISOString() },
      { ip: '172.16.0.25', count: 28, lastAttempt: new Date().toISOString() },
    ],
  };

  const mockBlockedIps = [
    {
      ip: '192.168.1.100',
      reason: 'Brute force attack',
      blockedAt: new Date().toISOString(),
    },
    {
      ip: '10.0.0.50',
      reason: 'Suspicious activity',
      blockedAt: new Date().toISOString(),
    },
  ];

  const mockSessions = [
    {
      id: '1',
      userId: 'user-1',
      userEmail: 'john@company.com',
      ip: '192.168.1.10',
      userAgent: 'Chrome 120.0 on Windows',
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      userId: 'user-2',
      userEmail: 'jane@company.com',
      ip: '192.168.1.11',
      userAgent: 'Safari 17.0 on macOS',
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      userId: 'user-3',
      userEmail: 'admin@company.com',
      ip: '192.168.1.12',
      userAgent: 'Firefox 121.0 on Linux',
      createdAt: new Date().toISOString(),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage system security
          </p>
        </div>
        <button
          onClick={() => setBlockIpModal(true)}
          className="btn btn-primary"
        >
          <NoSymbolIcon className="h-5 w-5 mr-2" />
          Block IP
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={clsx(
                'flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <tab.icon className="h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-danger-100 rounded-lg">
                  <NoSymbolIcon className="h-6 w-6 text-danger-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {mockThreats.blocked}
                  </p>
                  <p className="text-sm text-gray-500">Blocked Attempts (24h)</p>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-warning-100 rounded-lg">
                  <ExclamationTriangleIcon className="h-6 w-6 text-warning-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {mockThreats.suspicious}
                  </p>
                  <p className="text-sm text-gray-500">Suspicious IPs</p>
                </div>
              </div>
            </div>
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-success-100 rounded-lg">
                  <ShieldCheckIcon className="h-6 w-6 text-success-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {mockSessions.length}
                  </p>
                  <p className="text-sm text-gray-500">Active Sessions</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Threats */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Threat Activity
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {mockThreats.recentAttempts.map((attempt, index) => (
                <div
                  key={index}
                  className="p-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-danger-100 rounded-lg">
                      <GlobeAltIcon className="h-5 w-5 text-danger-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{attempt.ip}</p>
                      <p className="text-sm text-gray-500">
                        {attempt.count} failed attempts
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {format(new Date(attempt.lastAttempt), 'MMM d, HH:mm')}
                    </span>
                    <button
                      onClick={() =>
                        blockIpMutation.mutate({
                          ip: attempt.ip,
                          reason: 'Suspicious activity',
                        })
                      }
                      className="btn btn-secondary text-danger-600"
                    >
                      Block
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Recommendations */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Security Recommendations
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-success-50 rounded-lg">
                <ShieldCheckIcon className="h-5 w-5 text-success-600 mt-0.5" />
                <div>
                  <p className="font-medium text-success-800">
                    MFA is enabled for all admin accounts
                  </p>
                  <p className="text-sm text-success-700">
                    All system administrators have MFA configured
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-warning-50 rounded-lg">
                <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 mt-0.5" />
                <div>
                  <p className="font-medium text-warning-800">
                    12 users have weak passwords
                  </p>
                  <p className="text-sm text-warning-700">
                    Consider enforcing stronger password requirements
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                <LockClosedIcon className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">
                    API rate limiting is active
                  </p>
                  <p className="text-sm text-blue-700">
                    Currently set to 1000 requests per minute
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'threats' && (
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Threat Detection Log
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {mockThreats.recentAttempts.map((attempt, index) => (
              <div key={index} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-danger-100 rounded-lg">
                    <ExclamationTriangleIcon className="h-5 w-5 text-danger-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{attempt.ip}</p>
                    <p className="text-sm text-gray-500">
                      {attempt.count} failed login attempts detected
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    Last: {format(new Date(attempt.lastAttempt), 'MMM d, HH:mm')}
                  </span>
                  <button
                    onClick={() =>
                      blockIpMutation.mutate({
                        ip: attempt.ip,
                        reason: 'Suspicious activity',
                      })
                    }
                    className="btn btn-danger"
                  >
                    Block IP
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'blocked' && (
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Blocked IP Addresses</h3>
          </div>
          {mockBlockedIps.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {mockBlockedIps.map((blocked, index) => (
                <div key={index} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <NoSymbolIcon className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{blocked.ip}</p>
                      <p className="text-sm text-gray-500">{blocked.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      Blocked {format(new Date(blocked.blockedAt), 'MMM d, yyyy')}
                    </span>
                    <button
                      onClick={() => unblockIpMutation.mutate(blocked.ip)}
                      className="btn btn-secondary"
                    >
                      Unblock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No IP addresses are currently blocked
            </div>
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Active Sessions</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {mockSessions.map((session) => (
              <div key={session.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <UserIcon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{session.userEmail}</p>
                    <p className="text-sm text-gray-500">
                      {session.userAgent} · {session.ip}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    Started {format(new Date(session.createdAt), 'MMM d, HH:mm')}
                  </span>
                  <button
                    onClick={() => terminateSessionMutation.mutate(session.id)}
                    className="btn btn-secondary text-danger-600"
                  >
                    Terminate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Block IP Modal */}
      {blockIpModal && (
        <BlockIpModal
          onClose={() => setBlockIpModal(false)}
          onBlock={(ip, reason) => blockIpMutation.mutate({ ip, reason })}
        />
      )}
    </div>
  );
}

function BlockIpModal({
  onClose,
  onBlock,
}: {
  onClose: () => void;
  onBlock: (ip: string, reason: string) => void;
}) {
  const [ip, setIp] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onBlock(ip, reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Block IP Address</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              IP Address
            </label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="input"
              placeholder="192.168.1.100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input"
              rows={3}
              placeholder="Reason for blocking this IP..."
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-danger">
              Block IP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
