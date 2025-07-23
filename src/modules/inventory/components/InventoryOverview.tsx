import React from 'react';
import { Package, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import { useDashboardContext } from '../../../context/DashboardContext';
import { formatCurrency } from '../../../shared/utils/formatters';

const InventoryOverview: React.FC = () => {
  const { data } = useDashboardContext();

  const overviewCards = [
    {
      title: 'Total Stock Value',
      value: data.stock.closingStockValue,
      change: '+5.2%',
      trend: 'up',
      icon: Package,
      color: 'blue'
    },
    {
      title: 'Total Items',
      value: data.stock.itemLevels.length,
      change: '+3',
      trend: 'up',
      icon: BarChart3,
      color: 'green'
    },
    {
      title: 'Low Stock Items',
      value: data.stock.lowStockCount,
      change: '-2',
      trend: 'down',
      icon: AlertTriangle,
      color: 'red'
    },
    {
      title: 'Stock Turnover',
      value: 4.2,
      change: '+0.3',
      trend: 'up',
      icon: TrendingUp,
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      green: 'bg-green-50 border-green-200 text-green-700',
      blue: 'bg-blue-50 border-blue-200 text-blue-700',
      purple: 'bg-purple-50 border-purple-200 text-purple-700',
      red: 'bg-red-50 border-red-200 text-red-700'
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
                <span className={`text-sm font-medium ${
                  card.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {card.change}
                </span>
              </div>
              
              <h3 className="text-gray-600 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-gray-800">
                {card.title.includes('Value') 
                  ? formatCurrency(card.value)
                  : card.value
                }
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Stock Categories</h3>
          <div className="space-y-4">
            {[
              { category: 'Raw Materials', value: 45, color: 'blue' },
              { category: 'Finished Goods', value: 30, color: 'green' },
              { category: 'Work in Progress', value: 15, color: 'amber' },
              { category: 'Consumables', value: 10, color: 'purple' }
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-700">{item.category}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full bg-${item.color}-500`}
                      style={{ width: `${item.value}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{item.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Stock Movements</h3>
          <div className="space-y-3">
            {[
              { item: 'Raw Materials A', type: 'IN', quantity: 500, date: '15/01/2025' },
              { item: 'Finished Goods B', type: 'OUT', quantity: 200, date: '14/01/2025' },
              { item: 'Components D', type: 'IN', quantity: 150, date: '13/01/2025' },
              { item: 'Packaging Materials', type: 'OUT', quantity: 75, date: '12/01/2025' },
              { item: 'Safety Stock E', type: 'IN', quantity: 300, date: '11/01/2025' }
            ].map((movement, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{movement.item}</p>
                  <p className="text-sm text-gray-600">{movement.date}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    movement.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {movement.type} {movement.quantity}
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

export default InventoryOverview;