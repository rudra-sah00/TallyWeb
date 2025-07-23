import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  ChevronDown,
  ChevronUp,
  Search
} from 'lucide-react';
import { StockAnalytics } from '../../../services/api/inventory/stockAnalyticsService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface StockAnalyticsProps {
  analytics: StockAnalytics;
  loading: boolean;
}

const StockAnalyticsComponent: React.FC<StockAnalyticsProps> = ({ analytics, loading }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [topValueSearch, setTopValueSearch] = useState('');
  const [lowStockSearch, setLowStockSearch] = useState('');
  const [zeroStockSearch, setZeroStockSearch] = useState('');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Filter functions for each section with safety checks
  const filteredTopValueItems = (analytics.topValueItems || []).filter(item =>
    item.name.toLowerCase().includes(topValueSearch.toLowerCase())
  );

  const filteredLowStockItems = (analytics.lowStockItems || []).filter(item =>
    item.name.toLowerCase().includes(lowStockSearch.toLowerCase())
  );

  const filteredZeroStockItems = (analytics.zeroStockItems || []).filter(item =>
    item.name.toLowerCase().includes(zeroStockSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Generating analytics...</span>
        </div>
      </div>
    );
  }

  // Chart configurations with safety checks
  const unitDistributionData = {
    labels: analytics.itemsByUnit && analytics.itemsByUnit.length > 0 
      ? analytics.itemsByUnit.slice(0, 8).map(item => item.unit)
      : ['No Data'],
    datasets: [
      {
        data: analytics.itemsByUnit && analytics.itemsByUnit.length > 0
          ? analytics.itemsByUnit.slice(0, 8).map(item => item.count)
          : [1],
        backgroundColor: [
          '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
          '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
        ],
        borderWidth: 0,
      },
    ],
  };

  const valueDistributionData = {
    labels: analytics.valueDistribution && analytics.valueDistribution.length > 0
      ? analytics.valueDistribution.map(item => item.range)
      : ['No Data'],
    datasets: [
      {
        label: 'Number of Items',
        data: analytics.valueDistribution && analytics.valueDistribution.length > 0
          ? analytics.valueDistribution.map(item => item.count)
          : [1],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  const stockMovementData = {
    labels: ['Stock Increased', 'Stock Decreased', 'No Change'],
    datasets: [
      {
        data: analytics.stockMovement ? [
          analytics.stockMovement.increased || 0,
          analytics.stockMovement.decreased || 0,
          analytics.stockMovement.noChange || 0,
        ] : [0, 0, 1],
        backgroundColor: ['#10B981', '#EF4444', '#6B7280'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'K';
            }
            return value;
          }
        }
      }
    },
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalItems.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.totalValue >= 10000000 
                  ? `₹${(analytics.totalValue / 10000000).toFixed(2)}Cr`
                  : analytics.totalValue >= 100000
                  ? `₹${(analytics.totalValue / 100000).toFixed(2)}L`
                  : `₹${(analytics.totalValue / 1000).toFixed(2)}K`
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Item Value</p>
              <p className="text-2xl font-bold text-blue-600">
                ₹{analytics.averageValue.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Zero Stock Items</p>
              <p className="text-2xl font-bold text-orange-600">{analytics.zeroStockItems.length}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unit Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Items by Unit Type</h3>
          </div>
          <div className="h-80">
            <Doughnut data={unitDistributionData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Value Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Value Distribution</h3>
          </div>
          <div className="h-80">
            <Bar data={valueDistributionData} options={barChartOptions} />
          </div>
        </motion.div>

        {/* Stock Movement Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Stock Movement</h3>
          </div>
          <div className="h-80">
            <Doughnut data={stockMovementData} options={chartOptions} />
          </div>
        </motion.div>
      </div>

      {/* Collapsible Stock Lists Section */}
      <div className="space-y-4">
        {/* Top Value Items Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('topValue')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-900">Top Value Items</h3>
              <span className="text-sm text-gray-500 bg-green-100 px-3 py-1 rounded-full">
                {analytics.topValueItems.length} items (₹50K+)
              </span>
            </div>
            {expandedSection === 'topValue' ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          
          <AnimatePresence>
            {expandedSection === 'topValue' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-gray-200"
              >
                <div className="p-6">
                  {/* Search Bar */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search top value items..."
                        value={topValueSearch}
                        onChange={(e) => setTopValueSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent w-full"
                      />
                    </div>
                    {topValueSearch && (
                      <p className="text-sm text-gray-500 mt-2">
                        Showing {filteredTopValueItems.length} of {analytics.topValueItems.length} items
                      </p>
                    )}
                  </div>
                  
                  {filteredTopValueItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {filteredTopValueItems.map((item, index) => {
                        const closingValue = Math.abs(parseFloat(item.closingValue.replace(/[^\d.-]/g, '') || '0'));
                        const openingValue = Math.abs(parseFloat(item.openingValue.replace(/[^\d.-]/g, '') || '0'));
                        const maxValue = Math.max(closingValue, openingValue);
                        const balance = parseFloat(item.closingBalance.replace(/[^\d.-]/g, '') || '0');
                        
                        return (
                          <div key={index} className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-2" title={item.name}>
                                  {item.name}
                                </h4>
                                <div className="space-y-1 text-xs text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Package className="w-3 h-3" />
                                    <span>{balance.toFixed(2)} {item.baseUnits}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    <span className="font-medium text-green-700">
                                      {maxValue >= 10000000 
                                        ? `₹${(maxValue / 10000000).toFixed(2)}Cr`
                                        : maxValue >= 100000
                                        ? `₹${(maxValue / 100000).toFixed(2)}L`
                                        : maxValue >= 1000
                                        ? `₹${(maxValue / 1000).toFixed(2)}K`
                                        : `₹${maxValue.toFixed(2)}`
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-medium ml-2">
                                #{index + 1}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-lg font-medium mb-1">
                        {topValueSearch ? 'No matching high-value items found' : 'No High-Value Items Found'}
                      </p>
                      <p className="text-sm">
                        {topValueSearch ? 'Try adjusting your search criteria' : 'All items have zero or negative values'}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Low Stock Items Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('lowStock')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
              <h3 className="text-xl font-semibold text-gray-900">Low Stock Items</h3>
              <span className="text-sm text-gray-500 bg-yellow-100 px-3 py-1 rounded-full">
                {analytics.analysisMetadata?.totalLowStock || analytics.lowStockItems.length} total
                {analytics.analysisMetadata?.totalLowStock && analytics.analysisMetadata.totalLowStock > analytics.lowStockItems.length && 
                  ` (showing ${analytics.lowStockItems.length})`
                }
              </span>
              {analytics.analysisMetadata?.lowStockThreshold && (
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                  ≤ {analytics.analysisMetadata.lowStockThreshold} units
                </span>
              )}
            </div>
            {expandedSection === 'lowStock' ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          
          <AnimatePresence>
            {expandedSection === 'lowStock' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-gray-200"
              >
                <div className="p-6">
                  {/* Search Bar for Low Stock Items */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search low stock items..."
                        value={lowStockSearch}
                        onChange={(e) => setLowStockSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  {filteredLowStockItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {filteredLowStockItems.map((item, index) => {
                        const balance = parseFloat(item.closingBalance.replace(/[^\d.-]/g, '') || '0');
                        const value = Math.abs(parseFloat(item.closingValue.replace(/[^\d.-]/g, '') || '0'));
                        
                        return (
                          <div key={index} className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-2" title={item.name}>
                                  {item.name}
                                </h4>
                                <div className="space-y-1 text-xs text-gray-600">
                                  <div className="flex items-center gap-1 text-yellow-700">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span className="font-medium">{balance.toFixed(2)} {item.baseUnits} left</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    <span>₹{value.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs bg-yellow-600 text-white px-2 py-1 rounded-full font-medium ml-2">
                                Low
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-lg font-medium mb-1">
                        {lowStockSearch ? 'No matching low stock items found' : 'No Low Stock Items'}
                      </p>
                      <p className="text-sm">
                        {lowStockSearch ? 'Try adjusting your search criteria' : 'All items have sufficient stock'}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Zero Stock Items Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('zeroStock')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-red-600" />
              <h3 className="text-xl font-semibold text-gray-900">Zero Stock Items</h3>
              <span className="text-sm text-gray-500 bg-red-100 px-3 py-1 rounded-full">
                {analytics.analysisMetadata?.totalZeroStock || analytics.zeroStockItems.length} total
                {analytics.analysisMetadata?.totalZeroStock && analytics.analysisMetadata.totalZeroStock > analytics.zeroStockItems.length && 
                  ` (showing ${analytics.zeroStockItems.length})`
                }
              </span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                0 units
              </span>
            </div>
            {expandedSection === 'zeroStock' ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>
          
          <AnimatePresence>
            {expandedSection === 'zeroStock' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-gray-200"
              >
                <div className="p-6">
                  {/* Search Bar for Zero Stock Items */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search zero stock items..."
                        value={zeroStockSearch}
                        onChange={(e) => setZeroStockSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  {filteredZeroStockItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                      {filteredZeroStockItems.map((item, index) => {
                        const lastValue = Math.abs(parseFloat(item.openingValue.replace(/[^\d.-]/g, '') || '0'));
                        
                        return (
                          <div key={index} className="p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg border border-red-200 hover:shadow-md transition-all">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-sm leading-tight mb-2" title={item.name}>
                                  {item.name}
                                </h4>
                                <div className="space-y-1 text-xs text-gray-600">
                                  <div className="flex items-center gap-1 text-red-700">
                                    <Package className="w-3 h-3" />
                                    <span className="font-medium">Out of Stock</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    <span>Last Value: ₹{lastValue.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full font-medium ml-2">
                                0
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-lg font-medium mb-1">
                        {zeroStockSearch ? 'No matching zero stock items found' : 'No Items Out of Stock'}
                      </p>
                      <p className="text-sm">
                        {zeroStockSearch ? 'Try adjusting your search criteria' : 'All items have stock available'}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default StockAnalyticsComponent;
