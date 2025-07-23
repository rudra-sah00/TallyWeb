import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, Phone, Mail, MapPin, Star } from 'lucide-react';
import { useDashboardContext } from '../../../context/DashboardContext';
import { formatCurrency } from '../../../shared/utils/formatters';

const SupplierManagement: React.FC = () => {
  const { data } = useDashboardContext();
  const [searchTerm, setSearchTerm] = useState('');

  // Extended supplier data with contact information
  const suppliers = data.purchases.topSuppliers.map((supplier, index) => ({
    ...supplier,
    id: index + 1,
    email: `procurement@${supplier.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`,
    phone: `+91 ${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    address: `${Math.floor(Math.random() * 999) + 1}, Industrial Area, Pune`,
    totalOrders: Math.floor(Math.random() * 30) + 15,
    rating: (4 + Math.random()).toFixed(1),
    lastOrder: `${Math.floor(Math.random() * 30) + 1}/01/2025`,
    paymentTerms: ['30 Days', '45 Days', '60 Days'][Math.floor(Math.random() * 3)]
  }));

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={20} className="mr-2" />
          Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{supplier.name}</h3>
                <div className="flex items-center mt-1">
                  <Star className="text-yellow-400 fill-current" size={16} />
                  <span className="text-sm text-gray-600 ml-1">{supplier.rating}</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit size={16} />
                </button>
                <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <Mail size={16} className="mr-2" />
                {supplier.email}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone size={16} className="mr-2" />
                {supplier.phone}
              </div>
              <div className="flex items-start text-sm text-gray-600">
                <MapPin size={16} className="mr-2 mt-0.5" />
                {supplier.address}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Total Purchases</p>
                  <p className="font-bold text-blue-600">{formatCurrency(supplier.amount)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Total Orders</p>
                  <p className="font-bold text-gray-800">{supplier.totalOrders}</p>
                </div>
                <div>
                  <p className="text-gray-600">Payment Terms</p>
                  <p className="font-medium text-gray-800">{supplier.paymentTerms}</p>
                </div>
                <div>
                  <p className="text-gray-600">Last Order</p>
                  <p className="font-medium text-gray-800">{supplier.lastOrder}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SupplierManagement;