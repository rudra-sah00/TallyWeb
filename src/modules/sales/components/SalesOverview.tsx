import React from 'react';
import { SalesVoucher, DateRangeOption } from '../../../services/api/sales/salesApiService';
import SalesApiService from '../../../services/api/sales/salesApiService';
import { formatCurrency } from '../../../shared/utils/formatters';
import { Calendar, User, Receipt, DollarSign, RefreshCw } from 'lucide-react';

interface SalesOverviewProps {
  salesVouchers: SalesVoucher[];
  currentRangeLabel: string;
  loading: boolean;
  onVoucherClick: (voucher: SalesVoucher) => void;
  onDateRangeChange: (dateRange: DateRangeOption, customFrom?: Date, customTo?: Date) => void;
  salesApi: SalesApiService;
}

const SalesOverview: React.FC<SalesOverviewProps> = ({
  salesVouchers,
  currentRangeLabel,
  loading,
  onVoucherClick,
  onDateRangeChange
}) => {
  const [selectedDateRange, setSelectedDateRange] = React.useState<DateRangeOption>('currentMonth');
  const [customFromDate, setCustomFromDate] = React.useState<string>('');
  const [customToDate, setCustomToDate] = React.useState<string>('');

  const handleDateRangeChange = (range: DateRangeOption) => {
    setSelectedDateRange(range);
    onDateRangeChange(range);
  };

  const handleCustomDateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customFromDate && customToDate) {
      onDateRangeChange('custom', new Date(customFromDate), new Date(customToDate));
    }
  };

  const totalSales = salesVouchers.reduce((sum, voucher) => sum + voucher.amount, 0);
  const totalVouchers = salesVouchers.length;

  const dateRangeOptions = [
    { value: 'currentMonth' as DateRangeOption, label: 'This Month' },
    { value: 'lastMonth' as DateRangeOption, label: 'Last Month' },
    { value: 'currentYear' as DateRangeOption, label: 'Current FY' },
    { value: 'lastYear' as DateRangeOption, label: 'Previous FY' },
    { value: 'custom' as DateRangeOption, label: 'Custom Range' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          <span className="text-lg text-gray-600">Loading sales data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Date Range:</h3>
          
          {/* Quick Date Range Buttons */}
          <div className="flex flex-wrap gap-2">
            {dateRangeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleDateRangeChange(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedDateRange === option.value
                    ? 'bg-blue-500 text-white shadow-md transform scale-105'
                    : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => onDateRangeChange(selectedDateRange)}
            className="ml-auto px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center space-x-2 shadow-md"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
        
        {/* Custom Date Range Form */}
        {selectedDateRange === 'custom' && (
          <form onSubmit={handleCustomDateSubmit} className="flex items-center gap-4 mt-4 p-4 bg-white rounded-lg border border-blue-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Apply Range
            </button>
          </form>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Total Sales</p>
              <p className="text-3xl font-bold">{formatCurrency(totalSales)}</p>
              <p className="text-emerald-200 text-sm mt-1">{currentRangeLabel}</p>
            </div>
            <div className="h-14 w-14 bg-emerald-400 rounded-lg flex items-center justify-center">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Total Orders</p>
              <p className="text-3xl font-bold">{totalVouchers}</p>
              <p className="text-indigo-200 text-sm mt-1">Sales Transactions</p>
            </div>
            <div className="h-14 w-14 bg-indigo-400 rounded-lg flex items-center justify-center">
              <Receipt className="h-8 w-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Sales</h2>
          <p className="text-sm text-gray-600 mt-1">All sales transactions for {currentRangeLabel.toLowerCase()}</p>
        </div>
        
        {salesVouchers.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Sales Data</h3>
            <p className="text-gray-600">No sales vouchers found for {currentRangeLabel.toLowerCase()}.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Voucher Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {salesVouchers.map((voucher, index) => (
                  <tr key={voucher.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        {voucher.date}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => onVoucherClick(voucher)}
                        className="flex items-center text-blue-600 hover:text-blue-800 hover:underline transition-colors font-medium"
                      >
                        <Receipt className="h-4 w-4 text-gray-400 mr-2" />
                        {voucher.voucherNumber}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="truncate max-w-[200px]" title={voucher.partyName}>
                          {voucher.partyName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {formatCurrency(voucher.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesOverview;
