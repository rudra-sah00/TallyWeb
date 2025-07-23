import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, TrendingUp, TrendingDown, RefreshCw, Calendar, DollarSign, PieChart, BarChart3 } from 'lucide-react';
import CompanyApiService, { type TallyCompanyDetails } from '../../services/api/company/companyApiService';
import { balanceSheetApiService, type BalanceSheetData } from '../../services/api/balanceSheetApiService';
import { cacheService } from '../../services/cacheService';
import AnalyticsView from './components/AnalyticsView';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/Tabs';

const CompanyModule: React.FC = () => {
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

  useEffect(() => {
    loadCompanyDetails();
    loadBalanceSheet(); // Load balance sheet data initially
  }, []);

  useEffect(() => {
    loadBalanceSheet();
  }, [fromDate, toDate]);

  const loadCompanyDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // For now, using a default company name. You can modify this to use dynamic company selection
      const details = await companyApiService.getCompanyDetails('M/S. SAHOO SANITARY (2025-26)');
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
      
      console.log('Loading Balance Sheet with dates:', {
        originalFromDate: fromDate,
        originalToDate: toDate,
        formattedFromDate,
        formattedToDate
      });
      
      // Clear any cached balance sheet data for different date ranges
      cacheService.delete('balanceSheet');
      cacheService.delete(`balanceSheet_${formattedFromDate}_${formattedToDate}`);
      
      const data = await balanceSheetApiService.getBalanceSheet(
        formattedFromDate, 
        formattedToDate,
        'M/S. SAHOO SANITARY (2025-26)'
      );
      
      console.log('Balance Sheet Data loaded:', data);
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
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Company Management</h1>
        <p className="text-gray-600 mt-2">Comprehensive financial analysis and business insights for M/S. SAHOO SANITARY</p>
      </div>

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

      <Tabs defaultValue="overview" className="w-full">
        <div className="mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" icon={Building2}>Company Details</TabsTrigger>
            <TabsTrigger value="balance-sheet" icon={PieChart}>Balance Sheet</TabsTrigger>
            <TabsTrigger value="analytics" icon={BarChart3}>Analytics</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="space-y-6">
          <CompanyDetailsView 
            companyDetails={companyDetails} 
            loading={loading} 
          />
        </TabsContent>
        
        <TabsContent value="balance-sheet" className="space-y-6">
          {/* Date Controls for Balance Sheet */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Balance Sheet Controls</h3>
              </div>
              
              <div className="flex flex-col gap-4">
                {/* Financial Year Selection */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">Financial Year:</span>
                  {[2020, 2021, 2022, 2023, 2024].map(year => (
                    <button
                      key={year}
                      onClick={() => {
                        setFromDate(`${year}-04-01`);
                        setToDate(`${year + 1}-03-31`);
                      }}
                      className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
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
                    className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                    title="Current Financial Year"
                  >
                    Current FY
                  </button>
                </div>
                
                {/* Custom Date Range */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">Custom Range:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-blue-900 font-medium">
                  Reporting Period: {new Date(fromDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} to {new Date(toDate).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>
          <BalanceSheetView 
            balanceSheet={balanceSheet} 
            loading={loading}
            formatCurrency={formatCurrency}
          />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          {/* Date Controls for Analytics */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Analytics Controls</h3>
              </div>
              
              <div className="flex flex-col gap-4">
                {/* Financial Year Selection */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">Financial Year:</span>
                  {[2020, 2021, 2022, 2023, 2024].map(year => (
                    <button
                      key={year}
                      onClick={() => {
                        setFromDate(`${year}-04-01`);
                        setToDate(`${year + 1}-03-31`);
                      }}
                      className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
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
                    className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                    title="Current Financial Year"
                  >
                    Current FY
                  </button>
                </div>
                
                {/* Custom Date Range */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">Custom Range:</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <span className="text-purple-900 font-medium">
                  Analytics based on financial data from {new Date(fromDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: 'numeric' 
                  })} to {new Date(toDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>
          <AnalyticsView 
            balanceSheet={balanceSheet} 
            loading={loading}
            formatCurrency={formatCurrency}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Company Details Component
interface CompanyDetailsViewProps {
  companyDetails: TallyCompanyDetails | null;
  loading: boolean;
}

const CompanyDetailsView: React.FC<CompanyDetailsViewProps> = ({ companyDetails, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading company details...</span>
        </div>
      </div>
    );
  }

  if (!companyDetails) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Company Details Available</h3>
        <p className="text-gray-500">Company information could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Basic Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Building2 className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Company Information</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Company Name</label>
            <p className="text-gray-900 font-medium">{companyDetails.name || 'N/A'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Email</label>
            <p className="text-gray-900">{companyDetails.email || 'N/A'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Phone</label>
            <p className="text-gray-900">{companyDetails.phone || 'N/A'}</p>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">Books From</label>
            <p className="text-gray-900">{companyDetails.booksFrom || 'N/A'}</p>
          </div>
        </div>
      </motion.div>

      {/* Address Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <DollarSign className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Address & Location</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Address</label>
            <div className="text-gray-900">
              {companyDetails.address && companyDetails.address.length > 0 ? (
                companyDetails.address.map((addr, index) => (
                  <p key={index}>{addr}</p>
                ))
              ) : (
                <p>N/A</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">State</label>
              <p className="text-gray-900">{companyDetails.stateName || 'N/A'}</p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-500">Country</label>
              <p className="text-gray-900">{companyDetails.countryName || 'N/A'}</p>
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-gray-500">PIN Code</label>
            <p className="text-gray-900">{companyDetails.pincode || 'N/A'}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Balance Sheet Component
interface BalanceSheetViewProps {
  balanceSheet: BalanceSheetData | null;
  loading: boolean;
  formatCurrency: (amount: number) => string;
}

const BalanceSheetView: React.FC<BalanceSheetViewProps> = ({ balanceSheet, loading, formatCurrency }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading balance sheet...</span>
        </div>
      </div>
    );
  }

  if (!balanceSheet) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <PieChart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Balance Sheet Data Available</h3>
        <p className="text-gray-500">Balance sheet information could not be loaded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Assets</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(balanceSheet.totalAssets)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
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
              <p className="text-sm text-gray-600">Total Liabilities</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(balanceSheet.totalLiabilities)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
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
              <p className="text-sm text-gray-600">Net Worth</p>
              <p className={`text-2xl font-bold ${balanceSheet.netWorth >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatCurrency(balanceSheet.netWorth)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${balanceSheet.netWorth >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <DollarSign className={`w-6 h-6 ${balanceSheet.netWorth >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Assets and Liabilities Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 bg-green-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Assets
            </h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {balanceSheet.assets.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {balanceSheet.assets.map((asset, index) => {
                    const amount = asset.mainAmount !== 0 ? asset.mainAmount : asset.subAmount;
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {asset.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(Math.abs(amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-gray-500">
                No assets data available
              </div>
            )}
          </div>
        </motion.div>

        {/* Liabilities */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 bg-red-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Liabilities
            </h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {balanceSheet.liabilities.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {balanceSheet.liabilities.map((liability, index) => {
                    const amount = liability.mainAmount !== 0 ? liability.mainAmount : liability.subAmount;
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {liability.name}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                          {formatCurrency(Math.abs(amount))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-gray-500">
                No liabilities data available
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CompanyModule;
