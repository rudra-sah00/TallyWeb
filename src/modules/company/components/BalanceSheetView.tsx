import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { BalanceSheetData } from '../../services/api/balanceSheetApiService';

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

export default BalanceSheetView; 