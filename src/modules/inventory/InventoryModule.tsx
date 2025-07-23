import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, BarChart3, Package2 } from 'lucide-react';
import { inventoryApiService, type StockItem } from '../../services/api/inventory/inventoryApiService';
import { stockAnalyticsService, type StockAnalytics } from '../../services/api/inventory/stockAnalyticsService';
import { cacheService } from '../../services/cacheService';
import StockItemsList from './components/StockItemsList';
import StockAnalyticsComponent from './components/StockAnalytics';

type InventoryTab = 'stock-items' | 'analytics';

const InventoryModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('stock-items');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [analytics, setAnalytics] = useState<StockAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadStockItems();
  }, []);

  // Load analytics when switching to analytics tab
  useEffect(() => {
    if (activeTab === 'analytics' && stockItems.length > 0 && !analytics) {
      generateAnalytics();
    }
  }, [activeTab, stockItems, analytics]);

  const loadStockItems = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await inventoryApiService.getStockItems(forceRefresh);
      setStockItems(response.items);
      
      // Clear analytics if we're refreshing data
      if (forceRefresh) {
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Error loading stock items:', error);
      setError(error instanceof Error ? error.message : 'Failed to load stock items');
    } finally {
      setLoading(false);
    }
  };

  const generateAnalytics = () => {
    if (stockItems.length === 0) {
      console.log('❌ No stock items available for analytics');
      return;
    }
    
    console.log(`📊 Generating analytics for ${stockItems.length} items...`);
    try {
      const analyticsData = stockAnalyticsService.generateAnalytics(stockItems);
      console.log('✅ Analytics generated:', {
        totalItems: analyticsData.totalItems,
        topValueItemsCount: analyticsData.topValueItems.length,
        lowStockItemsCount: analyticsData.lowStockItems.length,
        zeroStockItemsCount: analyticsData.zeroStockItems.length,
        totalValue: analyticsData.totalValue
      });
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('❌ Error generating analytics:', error);
      setError('Failed to generate analytics');
    }
  };

  const handleRefresh = () => {
    loadStockItems(true); // Force refresh
    // Clear cache
    cacheService.delete('stockItems');
  };

  const tabs = [
    {
      key: 'stock-items' as InventoryTab,
      label: 'Stock Items',
      icon: Package2,
      description: 'View all stock items'
    },
    {
      key: 'analytics' as InventoryTab,
      label: 'Analytics',
      icon: BarChart3,
      description: 'Stock analytics and reports'
    }
  ];

  // Filter data based on search term
  const filteredStockItems = stockItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.languageName && item.languageName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Manage stock items and view inventory summaries</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Cache Status */}
          <div className="text-xs text-gray-500">
            {cacheService.has('stockItems') ? (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Cached
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                Live
              </span>
            )}
          </div>
          
          {/* Search - only show on stock-items tab */}
          {activeTab === 'stock-items' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
          )}
          
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="border-b border-gray-200"
      >
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </motion.div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </motion.div>
      )}

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-6"
      >
        {activeTab === 'stock-items' && (
          <StockItemsList
            items={filteredStockItems}
            loading={loading}
            searchTerm={searchTerm}
          />
        )}

        {activeTab === 'analytics' && (
          <StockAnalyticsComponent
            analytics={analytics || {
              totalItems: 0,
              totalValue: 0,
              averageValue: 0,
              topValueItems: [],
              lowStockItems: [],
              zeroStockItems: [],
              valueDistribution: [],
              itemsByUnit: [],
              stockMovement: { increased: 0, decreased: 0, noChange: 0 }
            }}
            loading={loading || (stockItems.length > 0 && !analytics)}
          />
        )}
      </motion.div>
    </div>
  );
};

export default InventoryModule;