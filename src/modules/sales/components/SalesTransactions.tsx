import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDashboardContext } from '../../../context/DashboardContext';
import VirtualSalesTable from './VirtualSalesTable';
import SalesApiService, { SalesVoucher } from '../../../services/api/sales/salesApiService';
import SalesCacheService from '../../../services/cache/salesCacheService';

const SalesTransactions: React.FC = () => {
  const { selectedCompany } = useDashboardContext();
  const [vouchers, setVouchers] = useState<SalesVoucher[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedVoucher, setSelectedVoucher] = useState<SalesVoucher | null>(null);
  
  const pageSize = 100; // Optimal page size for large datasets
  const salesApi = useMemo(() => new SalesApiService(), []);
  const cacheService = useMemo(() => SalesCacheService.getInstance(), []);

  // Date range - last 30 days by default
  const getDateRange = useCallback(() => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30);
    
    return {
      fromDate: fromDate.toISOString().split('T')[0].replace(/-/g, ''),
      toDate: toDate.toISOString().split('T')[0].replace(/-/g, '')
    };
  }, []);

  // Prefetch adjacent pages for smooth navigation
  const prefetchAdjacentPages = useCallback(async (currentPage: number, totalPages: number) => {
    const { fromDate, toDate } = getDateRange();
    
    if (!selectedCompany) return;

    const pagesToPrefetch = [];
    
    // Prefetch next 2 pages
    for (let i = 1; i <= 2; i++) {
      const nextPage = currentPage + i;
      if (nextPage <= totalPages) {
        pagesToPrefetch.push(nextPage);
      }
    }

    // Prefetch previous page
    if (currentPage > 1) {
      pagesToPrefetch.push(currentPage - 1);
    }

    // Execute prefetch in background
    pagesToPrefetch.forEach(page => {
      const taskKey = `prefetch-${page}`;
      const existingTask = cacheService.getBackgroundTask(taskKey);
      
      if (!existingTask) {
        const prefetchTask = salesApi.getSalesVouchers(
          fromDate,
          toDate,
          selectedCompany,
          page,
          pageSize,
          searchFilter.trim()
        ).then(response => {
          cacheService.cacheSalesPage(
            fromDate,
            toDate,
            selectedCompany,
            page,
            pageSize,
            searchFilter.trim(),
            response
          );
        }).catch(error => {
          console.warn(`Failed to prefetch page ${page}:`, error);
        });

        cacheService.setBackgroundTask(taskKey, prefetchTask);
      }
    });
  }, [selectedCompany, getDateRange, pageSize, searchFilter, salesApi, cacheService]);

  // Load sales data with caching
  const loadSalesData = useCallback(async (
    page: number,
    search: string = '',
    forceRefresh: boolean = false
  ) => {
    if (!selectedCompany) {
      setError('Please select a company first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { fromDate, toDate } = getDateRange();
      const searchQuery = search.trim();
      
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = cacheService.getCachedSalesPage(
          fromDate,
          toDate,
          selectedCompany,
          page,
          pageSize,
          searchQuery
        );

        if (cachedData) {
          setVouchers(cachedData.data);
          setTotalCount(cachedData.totalCount);
          setCurrentPage(page);
          setLoading(false);
          
          // Prefetch adjacent pages in background
          prefetchAdjacentPages(page, Math.ceil(cachedData.totalCount / pageSize));
          return;
        }
      }

      // Fetch from API
      const [vouchersResponse, countResponse] = await Promise.all([
        salesApi.getSalesVouchers(fromDate, toDate, selectedCompany, page, pageSize, searchQuery),
        page === 1 ? salesApi.getSalesVouchersCount(fromDate, toDate, selectedCompany, searchQuery) : Promise.resolve(totalCount)
      ]);

      // Update state
      setVouchers(vouchersResponse.data);
      setTotalCount(page === 1 ? countResponse : totalCount);
      setCurrentPage(page);

      // Cache the response
      cacheService.cacheSalesPage(
        fromDate,
        toDate,
        selectedCompany,
        page,
        pageSize,
        searchQuery,
        vouchersResponse
      );

      // Prefetch adjacent pages in background
      prefetchAdjacentPages(page, Math.ceil((page === 1 ? countResponse : totalCount) / pageSize));

    } catch (err) {
      console.error('Error loading sales data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sales data');
      
      // Fallback to cached data if available
      const { fromDate, toDate } = getDateRange();
      const cachedData = cacheService.getCachedSalesPage(
        fromDate,
        toDate,
        selectedCompany || '',
        page,
        pageSize,
        search.trim()
      );
      
      if (cachedData) {
        setVouchers(cachedData.data);
        setTotalCount(cachedData.totalCount);
        setError('Using cached data - server connection failed');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, getDateRange, pageSize, totalCount, salesApi, cacheService, prefetchAdjacentPages]);

  // Handle page changes
  const handlePageChange = useCallback((page: number) => {
    loadSalesData(page, searchFilter);
  }, [loadSalesData, searchFilter]);

  // Handle search
  const handleSearch = useCallback((searchTerm: string) => {
    setSearchFilter(searchTerm);
    setCurrentPage(1);
    loadSalesData(1, searchTerm);
  }, [loadSalesData]);

  // Handle view details
  const handleViewDetails = useCallback((voucher: SalesVoucher) => {
    setSelectedVoucher(voucher);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    // Clear cache for current criteria
    if (selectedCompany) {
      const { fromDate, toDate } = getDateRange();
      cacheService.clearCacheForCriteria(fromDate, toDate, selectedCompany);
    }
    
    loadSalesData(currentPage, searchFilter, true);
  }, [selectedCompany, getDateRange, cacheService, loadSalesData, currentPage, searchFilter]);

  // Initial load
  useEffect(() => {
    if (selectedCompany) {
      loadSalesData(1);
    }
  }, [selectedCompany, loadSalesData]);

  // Show error state
  if (error && vouchers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Sales Data</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleRefresh()}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800">{error}</p>
        </div>
      )}

      <VirtualSalesTable
        vouchers={vouchers}
        totalCount={totalCount}
        loading={loading}
        onLoadMore={handlePageChange}
        onSearch={handleSearch}
        onRefresh={handleRefresh}
        onViewDetails={handleViewDetails}
        currentPage={currentPage}
        pageSize={pageSize}
      />

      {/* Voucher Details Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                Voucher Details - {selectedVoucher.voucherNumber}
              </h4>
              <button
                onClick={() => setSelectedVoucher(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Voucher Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVoucher.voucherNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVoucher.date}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Voucher Type</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVoucher.voucherType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">₹{selectedVoucher.amount.toLocaleString()}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Party Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedVoucher.partyName}</p>
              </div>
              
              {selectedVoucher.reference && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reference</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedVoucher.reference}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Narration</label>
                <p className="mt-1 text-sm text-gray-900">{selectedVoucher.narration}</p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedVoucher(null)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesTransactions;