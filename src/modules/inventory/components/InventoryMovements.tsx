import React, { useState } from 'react';
import { Search, Filter, Download, ArrowUp, ArrowDown } from 'lucide-react';

const InventoryMovements: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [movementFilter, setMovementFilter] = useState('all');

  // Sample inventory movements data
  const movements = [
    { id: 1, date: '15/01/2025', item: 'Raw Materials A', type: 'IN', quantity: 500, reference: 'PO-001234', reason: 'Purchase Order' },
    { id: 2, date: '15/01/2025', item: 'Finished Goods B', type: 'OUT', quantity: 200, reference: 'SO-005678', reason: 'Sales Order' },
    { id: 3, date: '14/01/2025', item: 'Components D', type: 'IN', quantity: 150, reference: 'PO-001235', reason: 'Purchase Order' },
    { id: 4, date: '14/01/2025', item: 'Packaging Materials', type: 'OUT', quantity: 75, reference: 'PRD-001', reason: 'Production Use' },
    { id: 5, date: '13/01/2025', item: 'Safety Stock E', type: 'IN', quantity: 300, reference: 'ADJ-001', reason: 'Stock Adjustment' },
    { id: 6, date: '13/01/2025', item: 'Work in Progress C', type: 'OUT', quantity: 95, reference: 'PRD-002', reason: 'Production Transfer' },
    { id: 7, date: '12/01/2025', item: 'Tools & Equipment', type: 'IN', quantity: 25, reference: 'PO-001236', reason: 'Purchase Order' },
    { id: 8, date: '12/01/2025', item: 'Consumables G', type: 'OUT', quantity: 410, reference: 'ISS-001', reason: 'Internal Issue' },
    { id: 9, date: '11/01/2025', item: 'Export Items H', type: 'OUT', quantity: 125, reference: 'EXP-001', reason: 'Export Shipment' },
    { id: 10, date: '11/01/2025', item: 'Spare Parts F', type: 'IN', quantity: 85, reference: 'PO-001237', reason: 'Purchase Order' }
  ];

  const filteredMovements = movements.filter(movement => {
    const matchesSearch = movement.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         movement.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = movementFilter === 'all' || movement.type.toLowerCase() === movementFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search movements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={movementFilter}
            onChange={(e) => setMovementFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Movements</option>
            <option value="in">Stock In</option>
            <option value="out">Stock Out</option>
          </select>
        </div>
        
        <div className="flex gap-2">
          <button className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            <Filter size={20} className="mr-2" />
            More Filters
          </button>
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
            <Download size={20} className="mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-lg border bg-green-50 border-green-200 text-green-700">
              <ArrowUp size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-800">Stock In</h3>
              <p className="text-2xl font-bold text-green-600">
                {movements.filter(m => m.type === 'IN').length}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">This month</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-lg border bg-red-50 border-red-200 text-red-700">
              <ArrowDown size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-800">Stock Out</h3>
              <p className="text-2xl font-bold text-red-600">
                {movements.filter(m => m.type === 'OUT').length}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600">This month</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 text-blue-700">
              <Filter size={24} />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-800">Total Movements</h3>
              <p className="text-2xl font-bold text-blue-600">{movements.length}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600">This month</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMovements.map((movement) => (
                <tr key={movement.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {movement.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                    {movement.item}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      movement.type === 'IN' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {movement.type === 'IN' ? (
                        <ArrowUp size={12} className="mr-1" />
                      ) : (
                        <ArrowDown size={12} className="mr-1" />
                      )}
                      {movement.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                    {movement.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {movement.reference}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {movement.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>Showing {filteredMovements.length} of {movements.length} movements</p>
            <div className="flex space-x-2">
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                Previous
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryMovements;