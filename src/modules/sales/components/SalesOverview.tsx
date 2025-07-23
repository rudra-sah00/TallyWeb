import React from 'react';
import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';
import { useDashboardContext } from '../../../context/DashboardContext';
import { formatCurrency } from '../../../shared/utils/formatters';

const SalesOverview: React.FC = () => {
  const { data } = useDashboardContext();

  const overviewCards = [
    {
      title: 'Total Sales',
      value: data.overview.totalSales,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Active Customers',
      value: data.sales.topCustomers.length,
      change: '+3',
      trend: 'up',
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Total Transactions',
      value: data.sales.recentTransactions.length,
      change: '+8.2%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'purple'
    },
    {
      title: 'Average Order Value',
      value: Math.round(data.overview.totalSales / data.sales.recentTransactions.length),
      change: '+5.1%',
      trend: 'up',
      icon: TrendingUp,
      color: 'amber'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      green: 'bg-green-50 border-green-200 text-green-700',
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700',
      amber: 'bg-amber-50 border-amber-200 text-amber-700'
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {overviewCards.map((card, index) => {
          const Icon = card.icon;
          
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg border ${getColorClasses(card.color)}`}>
                  <Icon size={24} />
                </div>
                <span className="text-sm font-medium text-green-600">{card.change}</span>
              </div>
              
              <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-800">
                {card.title.includes('Customers') || card.title.includes('Transactions') 
                  ? card.value 
                  : formatCurrency(card.value)
                }
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Top Customers</h3>
          <div className="space-y-3">
            {data.sales.topCustomers.slice(0, 5).map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-800">{customer.name}</span>
                <span className="font-bold text-green-600">{formatCurrency(customer.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Sales</h3>
          <div className="space-y-3">
            {data.sales.recentTransactions.slice(0, 5).map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{transaction.customer}</p>
                  <p className="text-sm text-gray-600">{transaction.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">{formatCurrency(transaction.amount)}</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    transaction.status === 'Paid' ? 'bg-green-100 text-green-700' :
                    transaction.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {transaction.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesOverview;