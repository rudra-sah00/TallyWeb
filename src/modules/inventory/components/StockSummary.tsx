import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Calendar, TrendingUp, TrendingDown, Building2 } from 'lucide-react'; 
export interface StockSummaryItem {
  accountName: string;
  quantity: string;
  rate: string;
  amount: string;
}

interface StockSummaryProps {
  items: StockSummaryItem[];
  loading: boolean;
  dateRange: { fromDate: string; toDate: string };
  onDateRangeChange: (fromDate: string, toDate: string) => void;
  searchTerm: string;
}

const StockSummary: React.FC<StockSummaryProps> = ({
  items,
  loading,
  dateRange,
  onDateRangeChange,
  searchTerm
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDateRange, setTempDateRange] = useState(dateRange);

  // Helper function to format Tally date (YYYYMMDD) to display format
  const formatDisplayDate = (tallyDate: string): string => {
    if (tallyDate.length !== 8) return tallyDate;
    const year = tallyDate.substring(0, 4);
    const month = tallyDate.substring(4, 6);
    const day = tallyDate.substring(6, 8);
    return `${day}/${month}/${year}`;
  };

  // Helper function to format display date to Tally format
  const formatTallyDate = (displayDate: string): string => {
    const [year, month, day] = displayDate.split('-');
    return `${year}${month}${day}`;
  };

  // Helper function to format Tally date for input value
  const formatInputDate = (tallyDate: string): string => {
    if (tallyDate.length !== 8) return '';
    const year = tallyDate.substring(0, 4);
    const month = tallyDate.substring(4, 6);
    const day = tallyDate.substring(6, 8);
    return `${year}-${month}-${day}`;
  };

  const handleDateRangeApply = () => {
    onDateRangeChange(tempDateRange.fromDate, tempDateRange.toDate);
    setShowDatePicker(false);
  };

  // Calculate totals
  const totalAmount = items.reduce((sum, item) => {
    const amount = parseFloat(item.amount.replace(/[^\d.-]/g, '')) || 0;
    return sum + Math.abs(amount);
  }, 0);

  const itemsWithStock = items.filter(item => item.quantity && item.quantity.trim() !== '');

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading stock summary...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-200 p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-900">Stock Position As Of:</span>
            <span className="text-gray-600 font-semibold">
              {formatDisplayDate(dateRange.toDate)}
            </span>
          </div>
          
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
          >
            Change Date
          </button>
        </div>

        {/* Information Note */}
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> Stock Summary shows the current stock position as of the selected end date, 
            not the movement within a date range. This displays account-wise stock balances and values.
          </p>
        </div>

        {showDatePicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-gray-200"
          >
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Stock Position As Of Date
                </label>
                <input
                  type="date"
                  value={formatInputDate(tempDateRange.toDate)}
                  onChange={(e) => {
                    const tallyFormat = formatTallyDate(e.target.value);
                    setTempDateRange(() => ({
                      fromDate: tallyFormat, // Set same date for both
                      toDate: tallyFormat
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select the date for which you want to view the stock position
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleDateRangeApply}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={() => setShowDatePicker(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Accounts with Stock</p>
              <p className="text-2xl font-bold text-gray-900">{itemsWithStock.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stock Summary Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-lg border border-gray-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Stock Summary</h2>
            </div>
            <div className="text-sm text-gray-500">
              {items.length} {items.length === 1 ? 'account' : 'accounts'}
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No accounts found' : 'No stock summary available'}
            </h3>
            <p className="text-gray-500">
              {searchTerm
                ? `No accounts match "${searchTerm}"`
                : 'No stock summary data is available for the selected date range.'}
            </p>
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Name
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => {
                  const amount = parseFloat(item.amount.replace(/[^\d.-]/g, '')) || 0;
                  const isNegative = amount < 0;
                  
                  return (
                    <motion.tr
                      key={`${item.accountName}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-3 ${
                            item.quantity && item.quantity.trim() !== '' ? 'bg-green-500' : 'bg-gray-300'
                          }`}></div>
                          <span className="text-sm font-medium text-gray-900">
                            {item.accountName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {item.quantity || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {item.rate || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className={`flex items-center justify-end gap-1 ${
                          isNegative ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {isNegative && <TrendingDown className="w-3 h-3" />}
                          {!isNegative && amount > 0 && <TrendingUp className="w-3 h-3 text-green-600" />}
                          <span>₹{Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StockSummary;
