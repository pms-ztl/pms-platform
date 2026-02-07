import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi, securityApi } from '../../lib/api';
import clsx from 'clsx';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  ClockIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.get(id!),
    enabled: !!id,
  });

  const { data: sessions } = useQuery({
    queryKey: ['user-sessions', id],
    queryFn: () => securityApi.getActiveSessions(id),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  if (!user?.data) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">User not found</p>
        <button onClick={() => navigate('/users')} className="btn btn-primary mt-4">
          Back to Users
        </button>
      </div>
    );
  }

  const u = user.data;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-success-100 text-success-700',
      INACTIVE: 'bg-gray-100 text-gray-700',
      SUSPENDED: 'bg-danger-100 text-danger-700',
      PENDING: 'bg-warning-100 text-warning-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/users"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary-100 flex items-center justify-center">
              <UserIcon className="h-7 w-7 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {u.firstName} {u.lastName}
              </h1>
              <p className="text-sm text-gray-500">{u.email}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx('badge', getStatusBadge(u.status))}>{u.status}</span>
          <span className="badge bg-primary-100 text-primary-700">
            {u.role.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <BuildingOfficeIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Tenant</p>
                  <p className="font-medium text-gray-900">{u.tenantName || 'System'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">MFA Status</p>
                  <p className="font-medium text-gray-900">
                    {u.mfaEnabled ? (
                      <span className="text-success-600">Enabled</span>
                    ) : (
                      <span className="text-gray-500">Not configured</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="font-medium text-gray-900">
                    {u.lastLogin
                      ? format(new Date(u.lastLogin), 'MMM d, yyyy HH:mm')
                      : 'Never'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">
                    {format(new Date(u.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Sessions</h2>
            {sessions?.data && sessions.data.length > 0 ? (
              <div className="space-y-4">
                {sessions.data.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg">
                        <ComputerDesktopIcon className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {session.userAgent.includes('Chrome')
                            ? 'Chrome'
                            : session.userAgent.includes('Firefox')
                            ? 'Firefox'
                            : session.userAgent.includes('Safari')
                            ? 'Safari'
                            : 'Unknown Browser'}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <GlobeAltIcon className="h-4 w-4" />
                          <span>{session.ip}</span>
                          <span>·</span>
                          <span>
                            {format(new Date(session.createdAt), 'MMM d, HH:mm')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="text-sm text-danger-600 hover:text-danger-700">
                      Terminate
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No active sessions</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="btn btn-secondary w-full justify-start">
                <EnvelopeIcon className="h-5 w-5 mr-2" />
                Send Password Reset
              </button>
              {u.mfaEnabled && (
                <button className="btn btn-secondary w-full justify-start">
                  <ShieldCheckIcon className="h-5 w-5 mr-2" />
                  Disable MFA
                </button>
              )}
              <button className="btn btn-secondary w-full justify-start">
                <ComputerDesktopIcon className="h-5 w-5 mr-2" />
                Terminate All Sessions
              </button>
              {u.status === 'ACTIVE' ? (
                <button className="btn btn-danger w-full justify-start">
                  Suspend User
                </button>
              ) : u.status === 'SUSPENDED' ? (
                <button className="btn btn-primary w-full justify-start">
                  Activate User
                </button>
              ) : null}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Goals Created</span>
                <span className="font-medium text-gray-900">24</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Reviews Completed</span>
                <span className="font-medium text-gray-900">12</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Feedback Given</span>
                <span className="font-medium text-gray-900">48</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Login Count (30d)</span>
                <span className="font-medium text-gray-900">18</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
