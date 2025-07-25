import React, { useState, useEffect } from 'react';
import { useCompany } from '../../context/CompanyContext';
import SalesApiService, { SalesVoucher, DateRangeOption } from '../../services/api/sales/salesApiService';
import { SimpleVoucherModal } from './components/SimpleVoucherModal';
import SalesOverview from './components/SalesOverview';
import SalesAnalytics from './components/SalesAnalytics';
import SalesComparison from './components/SalesComparison';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/Tabs';
import { RefreshCw, AlertCircle, BarChart3, FileText, ArrowUpDown, TrendingUp } from 'lucide-react';

const SalesModule: React.FC = () => {
  const { selectedCompany } = useCompany();
  
  // Current period data (for overview tab)
  const [currentSalesVouchers, setCurrentSalesVouchers] = useState<SalesVoucher[]>([]);
  const [currentLoading, setCurrentLoading] = useState(false);
  const [currentRangeLabel, setCurrentRangeLabel] = useState<string>('');
  
  // Analytics data (auto-fetched)
  const [analyticsVouchers, setAnalyticsVouchers] = useState<SalesVoucher[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  
  // Comparison data (auto-fetched)
  const [comparisonCurrentVouchers, setComparisonCurrentVouchers] = useState<SalesVoucher[]>([]);
  const [comparisonPreviousVouchers, setComparisonPreviousVouchers] = useState<SalesVoucher[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  
  // Modal state for voucher details
  const [selectedVoucherGuid, setSelectedVoucherGuid] = useState<string>('');
  const [selectedVoucherNumber, setSelectedVoucherNumber] = useState<string>('');
  const [selectedVoucherData, setSelectedVoucherData] = useState<SalesVoucher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const salesApi = new SalesApiService();

  // Fetch current month data for overview
  const fetchCurrentMonthData = async () => {
    if (!selectedCompany) {
      setError('No company selected. Please select a company first.');
      return;
    }

    try {
      setCurrentLoading(true);
      setError(null);
      
      // Fetch the sales vouchers list 
      const vouchers = await salesApi.getSalesVouchers(selectedCompany, 'currentMonth');
      setCurrentSalesVouchers(vouchers);
      
      const range = salesApi.getDateRange('currentMonth');
      setCurrentRangeLabel(range.label);
      
    } catch (err) {
      console.error('Sales fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch current month sales data');
    } finally {
      setCurrentLoading(false);
    }
  };

  // Fetch analytics data (current financial year for detailed analysis)
  const fetchAnalyticsData = async () => {
    if (!selectedCompany) return;

    try {
      setAnalyticsLoading(true);
      setError(null);
      
      // Fetch current financial year data for analytics
      const vouchers = await salesApi.getSalesVouchers(selectedCompany, 'currentYear');
      setAnalyticsVouchers(vouchers);
      
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Fetch comparison data (current month vs previous month)
  const fetchComparisonData = async () => {
    if (!selectedCompany) return;

    try {
      setComparisonLoading(true);
      setError(null);
      
      // Fetch current month
      const currentVouchers = await salesApi.getSalesVouchers(selectedCompany, 'currentMonth');
      setComparisonCurrentVouchers(currentVouchers);
      
      // Fetch previous month
      const previousVouchers = await salesApi.getSalesVouchers(selectedCompany, 'lastMonth');
      setComparisonPreviousVouchers(previousVouchers);
      
    } catch (err) {
      console.error('Comparison fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch comparison data');
    } finally {
      setComparisonLoading(false);
    }
  };

  // Handle voucher click
  const handleVoucherClick = (voucher: SalesVoucher) => {
    setSelectedVoucherGuid(voucher.guid);
    setSelectedVoucherNumber(voucher.voucherNumber);
    setSelectedVoucherData(voucher); // Store the complete voucher data
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedVoucherGuid('');
    setSelectedVoucherNumber('');
    setSelectedVoucherData(null); // Clear the voucher data
  };

  // Handle date range change from overview tab
  const handleDateRangeChange = async (dateRange: DateRangeOption, customFrom?: Date, customTo?: Date) => {
    if (!selectedCompany) return;

    try {
      setCurrentLoading(true);
      setError(null);
      
      // Fetch sales vouchers for the selected date range
      const vouchers = await salesApi.getSalesVouchers(selectedCompany, dateRange, customFrom, customTo);
      setCurrentSalesVouchers(vouchers);
      
      const range = salesApi.getDateRange(dateRange, customFrom, customTo);
      setCurrentRangeLabel(range.label);
      
    } catch (err) {
      console.error('Sales fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sales data');
    } finally {
      setCurrentLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (selectedCompany) {
      fetchCurrentMonthData();
    }
  }, [selectedCompany]);

  // Auto-fetch analytics and comparison data when component mounts
  useEffect(() => {
    if (selectedCompany) {
      fetchAnalyticsData();
      fetchComparisonData();
    }
  }, [selectedCompany]);

  if (error && !currentSalesVouchers.length && !analyticsVouchers.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Sales Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Error loading sales data</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-xl border border-red-200 p-8">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-red-800">Error Loading Sales Data</h3>
                <p className="text-red-700 mt-1">{error}</p>
                <button
                  onClick={() => fetchCurrentMonthData()}
                  className="mt-4 px-6 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Sales Dashboard
            </h1>
            <p className="text-gray-600 mt-2">Comprehensive sales analytics and insights</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <div className="mb-8">
              <TabsList className="grid w-full grid-cols-3 bg-white rounded-2xl shadow-lg border border-gray-200 p-2">
                <TabsTrigger value="overview" icon={FileText}>
                  <span className="font-semibold">Sales Overview</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" icon={BarChart3}>
                  <span className="font-semibold">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="comparison" icon={ArrowUpDown}>
                  <span className="font-semibold">Comparison</span>
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Sales Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <SalesOverview
                salesVouchers={currentSalesVouchers}
                currentRangeLabel={currentRangeLabel}
                loading={currentLoading}
                onVoucherClick={handleVoucherClick}
                onDateRangeChange={handleDateRangeChange}
                salesApi={salesApi}
              />
            </TabsContent>
            
            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Sales Analytics</h2>
                    <p className="text-gray-600">Current month detailed analysis</p>
                  </div>
                  {analyticsLoading && (
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-500 ml-auto" />
                  )}
                </div>
              </div>
              
              <SalesAnalytics
                salesVouchers={analyticsVouchers}
                currentRangeLabel="Current Month"
                loading={analyticsLoading}
              />
            </TabsContent>
            
            {/* Comparison Tab */}
            <TabsContent value="comparison" className="space-y-6">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
                    <ArrowUpDown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Sales Comparison</h2>
                    <p className="text-gray-600">Current month vs Previous month</p>
                  </div>
                  {comparisonLoading && (
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-500 ml-auto" />
                  )}
                </div>
              </div>
              
              <SalesComparison
                currentPeriodVouchers={comparisonCurrentVouchers}
                currentPeriodLabel="This Month"
                loading={comparisonLoading}
                previousPeriodVouchers={comparisonPreviousVouchers}
                previousPeriodLabel="Previous Month"
              />
            </TabsContent>
          </Tabs>

          {/* Voucher Detail Modal */}
          <SimpleVoucherModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            voucherGuid={selectedVoucherGuid}
            voucherNumber={selectedVoucherNumber}
            voucherData={selectedVoucherData}
          />
        </div>
      </div>
    </div>
  );
};

export default SalesModule;
