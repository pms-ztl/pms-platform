import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { billingApi } from '../../lib/api';
import clsx from 'clsx';
import { format } from 'date-fns';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#d946ef', '#22c55e', '#f59e0b', '#3b82f6'];

export default function BillingPage() {
  const [page, setPage] = useState(1);

  const { data: billing } = useQuery({
    queryKey: ['billing', page],
    queryFn: () => billingApi.list({ page, limit: 10 }),
  });

  const { data: revenue } = useQuery({
    queryKey: ['revenue'],
    queryFn: () => billingApi.getRevenue({ period: 'monthly' }),
  });

  // Mock data for charts
  const revenueByMonth = [
    { month: 'Jul', revenue: 45000 },
    { month: 'Aug', revenue: 52000 },
    { month: 'Sep', revenue: 48000 },
    { month: 'Oct', revenue: 61000 },
    { month: 'Nov', revenue: 55000 },
    { month: 'Dec', revenue: 67000 },
  ];

  const revenueByPlan = [
    { name: 'Enterprise', value: 45000 },
    { name: 'Professional', value: 32000 },
    { name: 'Starter', value: 15000 },
    { name: 'Free', value: 0 },
  ];

  const stats = [
    {
      name: 'Monthly Revenue',
      value: '$67,000',
      change: '+12%',
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Active Subscriptions',
      value: '248',
      change: '+8%',
      icon: CreditCardIcon,
    },
    {
      name: 'Avg Revenue/Tenant',
      value: '$270',
      change: '+5%',
      icon: BuildingOfficeIcon,
    },
    {
      name: 'Churn Rate',
      value: '2.3%',
      change: '-0.5%',
      icon: ArrowTrendingUpIcon,
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PAID: 'bg-success-100 text-success-700',
      PENDING: 'bg-warning-100 text-warning-700',
      OVERDUE: 'bg-danger-100 text-danger-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Revenue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor revenue and manage billing across tenants
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {stat.value}
                </p>
              </div>
              <div className="p-3 bg-primary-100 rounded-lg">
                <stat.icon className="h-6 w-6 text-primary-600" />
              </div>
            </div>
            <p
              className={clsx(
                'text-sm mt-2',
                stat.change.startsWith('+') ? 'text-success-600' : 'text-danger-600'
              )}
            >
              {stat.change} from last month
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#d946ef" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue by Plan
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueByPlan}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {revenueByPlan.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {revenueByPlan.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  ${item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Billing Table */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Tenant Subscriptions
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Tenant</th>
                <th className="table-header">Plan</th>
                <th className="table-header">Status</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Next Billing</th>
                <th className="table-header">Payment Method</th>
                <th className="table-header w-10"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {billing?.data.data.map((b) => (
                <tr key={b.tenantId} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900">
                        {b.tenantName}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="badge bg-primary-100 text-primary-700">
                      {b.plan}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={clsx('badge', getStatusBadge(b.status))}>
                      {b.status}
                    </span>
                  </td>
                  <td className="table-cell font-medium text-gray-900">
                    ${b.amount.toLocaleString()}/{b.currency === 'USD' ? 'mo' : b.currency}
                  </td>
                  <td className="table-cell text-gray-500">
                    {format(new Date(b.currentPeriodEnd), 'MMM d, yyyy')}
                  </td>
                  <td className="table-cell">
                    {b.paymentMethod ? (
                      <div className="flex items-center">
                        <CreditCardIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-gray-700">
                          {b.paymentMethod.brand} •••• {b.paymentMethod.last4}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <button className="text-primary-600 hover:text-primary-700">
                      <DocumentTextIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {billing?.data && billing.data.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * 10 + 1} to{' '}
              {Math.min(page * 10, billing.data.total)} of {billing.data.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= billing.data.totalPages}
                className="btn btn-secondary"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
