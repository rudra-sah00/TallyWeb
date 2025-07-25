import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, RefreshCw, BarChart3, Package2, ChevronDown } from 'lucide-react';
import { inventoryApiService, type StockItem, type StockItemsResponse } from '../../services/api/inventory/inventoryApiService';
import { stockAnalyticsService, type StockAnalytics } from '../../services/api/inventory/stockAnalyticsService';
import { cacheService } from '../../services/cacheService';
import { useCompany } from '../../context/CompanyContext';
import StockItemsList from './components/StockItemsList';
import StockAnalyticsComponent from './components/StockAnalytics';

type InventoryTab = 'stock-items' | 'analytics';

const InventoryModule: React.FC = () => {
  const { selectedCompany, serverUrl } = useCompany();
  
  const [activeTab, setActiveTab] = useState<InventoryTab>('stock-items');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [analytics, setAnalytics] = useState<StockAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50; // Load 50 items at a time

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Update API base URL when serverUrl changes
  useEffect(() => {
    if (serverUrl) {
      inventoryApiService.setBaseURL(`http://${serverUrl}`);
    }
  }, [serverUrl]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset pagination when search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return;
    setCurrentPage(1);
    setStockItems([]);
    setHasMore(true);
    loadStockItems(true, 1, debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    loadStockItems();
  }, []);

  // Load analytics when switching to analytics tab
  useEffect(() => {
    if (activeTab === 'analytics' && stockItems.length > 0 && !analytics) {
      generateAnalytics();
    }
  }, [activeTab, stockItems, analytics]);

  const loadStockItems = useCallback(async (
    forceRefresh = false, 
    page = currentPage, 
    search = debouncedSearchTerm
  ) => {
    if (!selectedCompany) {
      setError('No company selected. Please select a company first.');
      return;
    }
    
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    
    try {
      const response: StockItemsResponse = await inventoryApiService.getStockItems({
        page,
        pageSize,
        searchTerm: search,
        forceRefresh,
        companyName: selectedCompany
      });
      
      if (page === 1) {
        // First page or search - replace items
        setStockItems(response.items);
      } else {
        // Additional pages - append items
        setStockItems(prev => [...prev, ...response.items]);
      }
      
      setCurrentPage(response.currentPage);
      setHasMore(response.hasMore);
      setTotalCount(response.totalCount);
      
      // Clear analytics if we're refreshing data
      if (forceRefresh) {
        setAnalytics(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load stock items');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [currentPage, debouncedSearchTerm, pageSize, selectedCompany]);

  const generateAnalytics = () => {
    if (stockItems.length === 0) {
      return;
    }
    
    try {
      const analyticsData = stockAnalyticsService.generateAnalytics(stockItems);
      setAnalytics(analyticsData);
    } catch (error) {
      setError('Failed to generate analytics');
    }
  };

  const handleRefresh = () => {
    setCurrentPage(1);
    setStockItems([]);
    setHasMore(true);
    loadStockItems(true, 1, debouncedSearchTerm); // Force refresh
    // Clear cache
    cacheService.delete('stockItems');
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadStockItems(false, currentPage + 1, debouncedSearchTerm);
    }
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
          <p className="text-gray-600 mt-1">
            Manage stock items and view inventory summaries 
            {stockItems.length > 0 && (
              <span className="ml-2 text-sm font-medium text-blue-600">
                • {stockItems.length.toLocaleString()} items loaded
                {totalCount > stockItems.length && ` of ${totalCount.toLocaleString()} total`}
                {searchTerm && ` • filtered by "${searchTerm}"`}
              </span>
            )}
          </p>
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
                placeholder="Search stock items..."
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
          <>
            <StockItemsList
              items={stockItems}
              loading={loading}
              searchTerm={debouncedSearchTerm}
            />
            
            {/* Load More Button */}
            {hasMore && stockItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-center pt-6"
              >
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Load More ({(totalCount - stockItems.length).toLocaleString()} remaining)
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </>
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