import React from 'react';
import { useAdminAnalytics } from './context';
import { Users, DollarSign, TrendingUp, LineChart } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { overview: data, loading, error } = useAdminAnalytics();

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Users</span>
            <Users className="w-4 h-4 text-[#0C54EA]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{data?.users?.total_users ?? 0}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">DAU</span>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{data?.users?.daily_active_users ?? 0}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Revenue</span>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{data?.revenue?.totalRevenue ?? '$0'}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Trends</span>
            <LineChart className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-sm text-gray-500">Updated {new Date(data?.lastUpdated || Date.now()).toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 h-64 flex items-center justify-center text-gray-500">Users growth chart (placeholder)</div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 h-64 flex items-center justify-center text-gray-500">Revenue chart (placeholder)</div>
      </div>
    </div>
  );
};

export default Dashboard;


