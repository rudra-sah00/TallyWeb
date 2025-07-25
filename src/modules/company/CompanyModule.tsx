import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, RefreshCw, Calendar, PieChart, BarChart3, AlertCircle} from 'lucide-react';
import CompanyApiService, { type TallyCompanyDetails } from '../../services/api/company/companyApiService';
import { balanceSheetApiService, type BalanceSheetData } from '../../services/api/balanceSheetApiService';
import { cacheService } from '../../services/cacheService';
import { useCompany } from '../../context/CompanyContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/Tabs';
import CompanyDetailsView from './components/CompanyDetailsView';
import BalanceSheetView from './components/BalanceSheetView';

const CompanyModule: React.FC = () => {
  const { selectedCompany, serverUrl } = useCompany();
  const [companyDetails, setCompanyDetails] = useState<TallyCompanyDetails | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-calculate current year dates
  const getCurrentYearDates = (fyStartMonth: number = 3) => { // 3 = April (0-indexed), can be changed
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (0 = January, 3 = April)
    
    // Financial year calculation based on fyStartMonth
    // fyStartMonth: 0=January, 1=February, 2=March, 3=April, etc.
    let fyStartYear, fyEndYear;
    
    if (currentMonth >= fyStartMonth) { // First half of FY
      fyStartYear = currentYear;
      fyEndYear = currentYear + 1;
    } else { // Second half of FY
      fyStartYear = currentYear - 1;
      fyEndYear = currentYear;
    }
    
    const fyStartMonthFormatted = (fyStartMonth + 1).toString().padStart(2, '0');
    const fromDate = `${fyStartYear}-${fyStartMonthFormatted}-01`; // Start of current financial year
    const toDate = now.toISOString().split('T')[0]; // Today's date
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return { 
      fromDate, 
      toDate,
      financialYear: `${fyStartYear}-${fyEndYear.toString().slice(-2)}`, // e.g., "2025-26"
      fyStartMonth: monthNames[fyStartMonth]
    };
  };

  // Configure your financial year start month here:
  // 0=January, 1=February, 2=March, 3=April, 6=July, etc.
  const FINANCIAL_YEAR_START_MONTH = 3; // Default: April (Indian FY)
  
  const { fromDate: initialFromDate, toDate: initialToDate } = getCurrentYearDates(FINANCIAL_YEAR_START_MONTH);
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);

  const companyApiService = new CompanyApiService();

  // Configure API service with server URL
  useEffect(() => {
    if (serverUrl) {
      console.log('Setting server URL:', serverUrl);
      companyApiService.setBaseURL(`http://${serverUrl}`);
      balanceSheetApiService.setBaseURL(`http://${serverUrl}`);
    }
  }, [serverUrl]);

  useEffect(() => {
    if (selectedCompany) {
      console.log('Loading company details for:', selectedCompany);
      loadCompanyDetails();
      loadBalanceSheet(); // Load balance sheet data initially
    }
  }, [selectedCompany]);

  useEffect(() => {
    loadBalanceSheet();
  }, [fromDate, toDate]);

  const loadCompanyDetails = async () => {
    if (!selectedCompany) {
      setError('No company selected');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching company details...');
      const details = await companyApiService.getCompanyDetails(selectedCompany);
      console.log('Company details received:', details);
      setCompanyDetails(details);
    } catch (error) {
      console.error('Error loading company details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const loadBalanceSheet = async () => {
    setLoading(true);
    setError(null);
    try {
      const formattedFromDate = fromDate.replace(/-/g, '');
      const formattedToDate = toDate.replace(/-/g, '');
      
      // Clear any cached balance sheet data for different date ranges
      cacheService.delete('balanceSheet');
      cacheService.delete(`balanceSheet_${formattedFromDate}_${formattedToDate}`);
      
      const data = await balanceSheetApiService.getBalanceSheet(
        formattedFromDate, 
        formattedToDate,
        selectedCompany
      );
      
      setBalanceSheet(data);
    } catch (error) {
      console.error('Error loading balance sheet:', error);
      setError(error instanceof Error ? error.message : 'Failed to load balance sheet');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadCompanyDetails();
    loadBalanceSheet();
    // Clear relevant cache
    cacheService.delete('companyDetails');
    cacheService.delete('balanceSheet');
  };

  const formatCurrency = (amount: number): string => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 10000000) {
      return `₹${(absAmount / 10000000).toFixed(2)}Cr`;
    } else if (absAmount >= 100000) {
      return `₹${(absAmount / 100000).toFixed(2)}L`;
    } else if (absAmount >= 1000) {
      return `₹${(absAmount / 1000).toFixed(2)}K`;
    } else {
      return `₹${absAmount.toFixed(2)}`;
    }
  };
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="p-6 space-y-8">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Company Management
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Comprehensive financial analysis and business insights
                  </p>
                </div>
              </div>
              {selectedCompany && (
                <div className="flex items-center gap-2 mt-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-gray-700">
                    Active Company: <span className="text-blue-600">{selectedCompany}</span>
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
            </div>
          </div>
        </motion.div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 px-6 py-4 rounded-xl shadow-lg"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <div>
                  <span className="font-semibold">Error occurred:</span>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Tabs defaultValue="overview" className="w-full">
          <div className="mb-8">
            <TabsList className="grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg rounded-xl p-2">
              <TabsTrigger value="overview" icon={Building2}>Company Details</TabsTrigger>
              <TabsTrigger value="balance-sheet" icon={PieChart}>Balance Sheet</TabsTrigger>
              <TabsTrigger value="analytics" icon={BarChart3}>Analytics</TabsTrigger>
            </TabsList>
          </div>
        
          <TabsContent value="overview" className="space-y-8">
            <CompanyDetailsView 
              companyDetails={companyDetails} 
              loading={loading} 
            />
          </TabsContent>
          
          <TabsContent value="balance-sheet" className="space-y-8">
            {/* Date Controls for Balance Sheet */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Balance Sheet Controls</h3>
                    <p className="text-sm text-gray-600">Select date range for financial analysis</p>
                  </div>
                </div>
              
                <div className="flex flex-col gap-6">
                  {/* Financial Year Selection */}
                  <div className="space-y-3">
                    <span className="text-sm text-gray-700 font-semibold">Quick Financial Year Selection:</span>
                    <div className="flex flex-wrap gap-2">
                      {[2020, 2021, 2022, 2023, 2024].map(year => (
                        <button
                          key={year}
                          onClick={() => {
                            setFromDate(`${year}-04-01`);
                            setToDate(`${year + 1}-03-31`);
                          }}
                          className="px-4 py-2 text-sm bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                          title={`Financial Year ${year}-${(year + 1).toString().slice(-2)}`}
                        >
                          FY {year}-{(year + 1).toString().slice(-2)}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          const { fromDate: newFromDate, toDate: newToDate } = getCurrentYearDates(FINANCIAL_YEAR_START_MONTH);
                          setFromDate(newFromDate);
                          setToDate(newToDate);
                        }}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                        title="Current Financial Year"
                      >
                        Current FY
                      </button>
                    </div>
                  </div>
                  
                  {/* Custom Date Range */}
                  <div className="space-y-3">
                    <span className="text-sm text-gray-700 font-semibold">Custom Date Range:</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-gray-500 font-medium">to</span>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Apply Range
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/50 rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-blue-900 font-semibold">Current Reporting Period</h4>
                  <p className="text-blue-700 text-sm">
                    {new Date(fromDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} to {new Date(toDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </motion.div>
            <BalanceSheetView 
              balanceSheet={balanceSheet} 
              loading={loading}
              formatCurrency={formatCurrency}
            />
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-8">
            {/* Date Controls for Analytics */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 shadow-lg p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Analytics Controls</h3>
                    <p className="text-sm text-gray-600">Configure data range for detailed analysis</p>
                  </div>
                </div>
              
                <div className="flex flex-col gap-6">
                  {/* Financial Year Selection */}
                  <div className="space-y-3">
                    <span className="text-sm text-gray-700 font-semibold">Quick Financial Year Selection:</span>
                    <div className="flex flex-wrap gap-2">
                      {[2020, 2021, 2022, 2023, 2024].map(year => (
                        <button
                          key={year}
                          onClick={() => {
                            setFromDate(`${year}-04-01`);
                            setToDate(`${year + 1}-03-31`);
                          }}
                          className="px-4 py-2 text-sm bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 text-purple-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                          title={`Financial Year ${year}-${(year + 1).toString().slice(-2)}`}
                        >
                          FY {year}-{(year + 1).toString().slice(-2)}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          const { fromDate: newFromDate, toDate: newToDate } = getCurrentYearDates(FINANCIAL_YEAR_START_MONTH);
                          setFromDate(newFromDate);
                          setToDate(newToDate);
                        }}
                        className="px-4 py-2 text-sm bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 text-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                        title="Current Financial Year"
                      >
                        Current FY
                      </button>
                    </div>
                  </div>
                  
                  {/* Custom Date Range */}
                  <div className="space-y-3">
                    <span className="text-sm text-gray-700 font-semibold">Custom Date Range:</span>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <span className="text-gray-500 font-medium">to</span>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Apply Range
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/50 rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-purple-900 font-semibold">Analytics Period</h4>
                  <p className="text-purple-700 text-sm">
                    Data analysis from {new Date(fromDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CompanyModule;
