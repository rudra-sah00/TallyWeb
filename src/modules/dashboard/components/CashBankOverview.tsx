import React from 'react';
import { Wallet, Building, Users, UserCheck } from 'lucide-react';
import { useDashboardContext } from '../../../context/DashboardContext';
import { formatCurrency } from '../../../shared/utils/formatters';

const CashBankOverview: React.FC = () => {
  const { data, loading } = useDashboardContext();

  // Show loading state or return empty if data not available
  if (loading || !data || !data.cashBank) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
        <div className="w-48 h-6 bg-gray-200 rounded mb-6"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="p-4 rounded-lg border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="w-12 h-3 bg-gray-200 rounded"></div>
              </div>
              <div className="w-20 h-3 bg-gray-200 rounded mb-1"></div>
              <div className="w-24 h-5 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const items = [
    {
      label: 'Cash in Hand',
      value: data.cashBank.cashInHand,
      change: '+₹2,500',
      icon: Wallet,
      color: 'green'
    },
    {
      label: 'Bank Balance',
      value: data.cashBank.bankBalance,
      change: '+₹15,000',
      icon: Building,
      color: 'blue'
    },
    {
      label: 'Receivables',
      value: data.cashBank.receivables,
      change: '-₹8,500',
      icon: Users,
      color: 'amber'
    },
    {
      label: 'Payables',
      value: data.cashBank.payables,
      change: '+₹12,000',
      icon: UserCheck,
      color: 'red'
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
      <h2 className="text-xl font-bold text-gray-800 mb-6">Cash & Bank Overview</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          
          return (
            <div key={index} className="p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg border ${getColorClasses(item.color)}`}>
                  <Icon size={20} />
                </div>
                <span className="text-xs text-gray-500">{item.change}</span>
              </div>
              
              <h3 className="text-sm font-medium text-gray-600 mb-1">{item.label}</h3>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(item.value)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CashBankOverview;