import React from 'react';
import { AlertTriangle, Package, Clock, ShoppingCart } from 'lucide-react';
import { useDashboardContext } from '../../../context/DashboardContext';

const LowStockAlerts: React.FC = () => {
  const { data } = useDashboardContext();

  // Filter items with low stock (quantity < 100)
  const lowStockItems = data.stock.itemLevels.filter(item => item.quantity < 100);
  const criticalStockItems = data.stock.itemLevels.filter(item => item.quantity < 50);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-lg border bg-red-50 border-red-200 text-red-700">
              <AlertTriangle size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-800">Critical Stock</h3>
              <p className="text-2xl font-bold text-red-600">{criticalStockItems.length}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Items below 50 units</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-lg border bg-amber-50 border-amber-200 text-amber-700">
              <Package size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-800">Low Stock</h3>
              <p className="text-2xl font-bold text-amber-600">{lowStockItems.length}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Items below 100 units</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-700">
              <ShoppingCart size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-800">Reorder Required</h3>
              <p className="text-2xl font-bold text-blue-600">{lowStockItems.length}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">Items need reordering</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <AlertTriangle className="text-red-600 mr-2" size={20} />
            <h3 className="text-lg font-semibold text-gray-700">Critical Stock Items</h3>
          </div>
          
          <div className="space-y-3">
            {criticalStockItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-sm text-red-600">Critical - Immediate action required</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">{item.quantity}</p>
                  <button className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors">
                    Reorder Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <Clock className="text-amber-600 mr-2" size={20} />
            <h3 className="text-lg font-semibold text-gray-700">Low Stock Items</h3>
          </div>
          
          <div className="space-y-3">
            {lowStockItems.filter(item => item.quantity >= 50).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-sm text-amber-600">Low stock - Plan reorder</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-amber-600">{item.quantity}</p>
                  <button className="text-xs bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-700 transition-colors">
                    Add to Reorder
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Reorder Recommendations</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-700">Item Name</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Current Stock</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Suggested Reorder</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Lead Time</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Priority</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {lowStockItems.map((item, index) => {
                const suggestedReorder = Math.max(200, item.quantity * 3);
                const leadTime = Math.floor(Math.random() * 14) + 3;
                const priority = item.quantity < 50 ? 'High' : 'Medium';
                
                return (
                  <tr key={index} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-800">{item.name}</td>
                    <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
                    <td className="px-4 py-3 text-center text-blue-600 font-medium">{suggestedReorder}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{leadTime} days</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                        Create PO
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LowStockAlerts;