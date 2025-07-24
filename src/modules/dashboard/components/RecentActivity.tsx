import React from 'react';
import { Clock, ShoppingCart, Package, CreditCard } from 'lucide-react';
import { useDashboardContext } from '../../../context/DashboardContext';
import { formatCurrency } from '../../../shared/utils/formatters';

const RecentActivity: React.FC = () => {
  const { data, loading } = useDashboardContext();

  // Show loading state or return empty if data not available
  if (loading || !data || !data.sales || !data.purchases || !data.expenses) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="w-48 h-6 bg-gray-200 rounded mb-6"></div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div>
                  <div className="w-32 h-4 bg-gray-200 rounded mb-1"></div>
                  <div className="w-20 h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="text-right">
                <div className="w-16 h-4 bg-gray-200 rounded mb-1"></div>
                <div className="w-12 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Combine recent activities from different modules
  const recentActivities = [
    ...data.sales.recentTransactions.slice(0, 3).map(t => ({
      type: 'sale',
      description: `Sale to ${t.customer}`,
      amount: t.amount,
      date: t.date,
      status: t.status,
      icon: ShoppingCart
    })),
    ...data.purchases.recentTransactions.slice(0, 3).map(t => ({
      type: 'purchase',
      description: `Purchase from ${t.supplier}`,
      amount: t.amount,
      date: t.date,
      status: t.status,
      icon: Package
    })),
    ...data.expenses.recentEntries.slice(0, 2).map(e => ({
      type: 'expense',
      description: e.description,
      amount: e.amount,
      date: e.date,
      status: 'Paid',
      icon: CreditCard
    }))
  ].sort((a, b) => new Date(b.date.split('/').reverse().join('-')).getTime() - new Date(a.date.split('/').reverse().join('-')).getTime())
   .slice(0, 8);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-700';
      case 'Pending':
        return 'bg-amber-100 text-amber-700';
      case 'Overdue':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'sale':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'purchase':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'expense':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center mb-6">
        <Clock className="text-blue-600 mr-2" size={24} />
        <h2 className="text-xl font-bold text-gray-800">Recent Activity</h2>
      </div>
      
      <div className="space-y-4">
        {recentActivities.map((activity, index) => {
          const Icon = activity.icon;
          
          return (
            <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-lg border ${getTypeColor(activity.type)}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-medium text-gray-800">{activity.description}</p>
                  <p className="text-sm text-gray-600">{activity.date}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-bold text-gray-800">{formatCurrency(activity.amount)}</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                  {activity.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentActivity;