import React from 'react';
import { TrendingUp, TrendingDown, ShoppingCart, Package, CreditCard, Wallet, Calculator, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import { useDashboardContext } from '../../../context/DashboardContext';
import { formatCurrency } from '../../../shared/utils/formatters';

const OverviewCards: React.FC = () => {
  const { data, loading, error, refreshData } = useDashboardContext();

  // Show loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
            <div className="w-32 h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // Show error state with retry option
  if (error) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-red-200 text-center">
        <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Data</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={refreshData}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={16} className="mr-2" />
          Retry
        </button>
      </div>
    );
  }

  // Return loading if data is not available yet
  if (!data || !data.overview) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="w-16 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
            <div className="w-32 h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Sales',
      value: data.overview.totalSales,
      change: '+12.5%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'green'
    },
    {
      title: 'Total Purchases',
      value: data.overview.totalPurchases,
      change: '+8.2%',
      trend: 'up',
      icon: Package,
      color: 'blue'
    },
    {
      title: 'Total Expenses',
      value: data.overview.totalExpenses,
      change: '-3.1%',
      trend: 'down',
      icon: CreditCard,
      color: 'amber'
    },
    {
      title: 'Net Profit',
      value: data.overview.netProfit,
      change: '+15.8%',
      trend: 'up',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'GST Payable',
      value: data.overview.gstPayable,
      change: '+5.4%',
      trend: 'up',
      icon: Calculator,
      color: 'red'
    },
    {
      title: 'Cash & Bank',
      value: data.overview.cashBank,
      change: '+7.2%',
      trend: 'up',
      icon: Wallet,
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      green: 'bg-green-50 border-green-200 text-green-700',
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      amber: 'bg-amber-50 border-amber-200 text-amber-700',
      red: 'bg-red-50 border-red-200 text-red-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700'
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const TrendIcon = card.trend === 'up' ? TrendingUp : TrendingDown;
        
        return (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg border ${getColorClasses(card.color)}`}>
                <Icon size={24} />
              </div>
              <div className={`flex items-center space-x-1 text-sm font-medium ${
                card.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                <TrendIcon size={16} />
                <span>{card.change}</span>
              </div>
            </div>
            
            <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
            <p className="text-2xl font-bold text-gray-800">{formatCurrency(card.value)}</p>
          </div>
        );
      })}
    </div>
  );
};

export default OverviewCards;