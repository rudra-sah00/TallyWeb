import React from 'react';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useDashboardContext } from '../../../context/DashboardContext';

const QuickStats: React.FC = () => {
  const { data, loading } = useDashboardContext();

  // Show loading state or return empty if data not available
  if (loading || !data || !data.outstanding || !data.stock || !data.sales) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="w-32 h-6 bg-gray-200 rounded mb-6"></div>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="p-4 rounded-lg border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="w-16 h-3 bg-gray-200 rounded mb-1"></div>
              <div className="w-8 h-5 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Overdue Bills',
      value: data.outstanding.receivable.filter(bill => bill.daysOverdue > 0).length,
      icon: AlertTriangle,
      color: 'red'
    },
    {
      label: 'Low Stock Items',
      value: data.stock.lowStockCount,
      icon: Clock,
      color: 'amber'
    },
    {
      label: 'Paid This Month',
      value: data.sales.recentTransactions.filter(t => t.status === 'Paid').length,
      icon: CheckCircle,
      color: 'green'
    },
    {
      label: 'GST Due Days',
      value: 15,
      icon: TrendingUp,
      color: 'blue'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      green: 'bg-green-50 border-green-200 text-green-700',
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      amber: 'bg-amber-50 border-amber-200 text-amber-700',
      red: 'bg-red-50 border-red-200 text-red-700'
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Quick Stats</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          
          return (
            <div key={index} className="p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
              <div className="flex items-center mb-3">
                <div className={`p-2 rounded-lg border ${getColorClasses(stat.color)}`}>
                  <Icon size={20} />
                </div>
              </div>
              
              <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.label}</h3>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuickStats;