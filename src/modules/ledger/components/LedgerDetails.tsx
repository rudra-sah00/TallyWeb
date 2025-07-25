import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Building,
  FileText,
  Download,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { TallyLedger } from '../../../services/api/ledger/ledgerApiService';
import VoucherApiService, { VoucherTransaction } from '../../../services/api/voucher/voucherApiService';

interface LedgerDetailsProps {
  ledger: TallyLedger;
  companyName: string;
  serverUrl: string;
  onBack: () => void;
}

const LedgerDetails: React.FC<LedgerDetailsProps> = ({ ledger, companyName, serverUrl, onBack }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'transactions'>('details');
  const [transactions, setTransactions] = useState<VoucherTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<VoucherTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAllTime, setIsAllTime] = useState(false);

  const voucherApi = new VoucherApiService();

  useEffect(() => {
    if (serverUrl) {
      voucherApi.setBaseURL(`http://${serverUrl}`);
    }
    // Set default date range to current month
    const { fromDate: defaultFrom, toDate: defaultTo } = VoucherApiService.getCurrentMonthRange();
    const fromFormatted = formatDateForInput(defaultFrom);
    const toFormatted = formatDateForInput(defaultTo);
    setFromDate(fromFormatted);
    setToDate(toFormatted);
  }, [serverUrl]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm]);

  const formatDateForInput = (tallyDate: string): string => {
    if (tallyDate.length === 8) {
      const year = tallyDate.substring(0, 4);
      const month = tallyDate.substring(4, 6);
      const day = tallyDate.substring(6, 8);
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  const formatDateForTally = (inputDate: string): string => {
    return inputDate.replace(/-/g, '');
  };

  const setDateRange = (range: 'currentMonth' | 'lastMonth' | 'currentYear' | 'lastYear') => {
    const now = new Date();
    let fromDate = '';
    let toDate = '';

    switch (range) {
      case 'currentMonth':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'lastMonth':
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        toDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'currentYear':
        fromDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        toDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
        break;
      case 'lastYear':
        fromDate = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
        toDate = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
        break;
    }

    setFromDate(fromDate);
    setToDate(toDate);
    setIsAllTime(false);
  };

  const fetchTransactions = async () => {
    if (!isAllTime && (!fromDate || !toDate)) {
      setError('Please select both from and to dates, or choose "All Time"');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let tallyFromDate = '';
      let tallyToDate = '';
      
      if (!isAllTime) {
        tallyFromDate = formatDateForTally(fromDate);
        tallyToDate = formatDateForTally(toDate);
      } else {
      }
      
      const transactionList = await voucherApi.getVoucherTransactions(
        companyName,
        ledger.name,
        tallyFromDate,
        tallyToDate
      );
      setTransactions(transactionList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    if (!searchTerm) {
      setFilteredTransactions(transactions);
      return;
    }

    const filtered = transactions.filter(transaction =>
      transaction.voucherNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.partyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.voucherType.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredTransactions(filtered);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const getBalanceColor = (amount: number): string => {
    if (amount > 0) return 'text-green-600';
    if (amount < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getBooleanIcon = (value: boolean) => {
    return value ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  const renderDetailsTab = () => (
    <div className="space-y-6">
      {/* Balance Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.1)" }}
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-blue-100 rounded-lg mr-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Opening Balance</h3>
              <p className="text-sm text-gray-600">Balance at period start</p>
            </div>
          </div>
          <div className="flex items-center">
            <span className={`text-2xl font-bold ${getBalanceColor(ledger.openingBalance)}`}>
              {formatCurrency(ledger.openingBalance)}
            </span>
            <span className="ml-2 text-sm text-gray-500">
              {ledger.openingBalance >= 0 ? 'Dr' : 'Cr'}
            </span>
          </div>
        </motion.div>

        <motion.div 
          className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
          whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.1)" }}
        >
          <div className="flex items-center mb-4">
            <div className="p-3 bg-green-100 rounded-lg mr-4">
              <TrendingDown className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Closing Balance</h3>
              <p className="text-sm text-gray-600">Current balance</p>
            </div>
          </div>
          <div className="flex items-center">
            <span className={`text-2xl font-bold ${getBalanceColor(ledger.closingBalance)}`}>
              {formatCurrency(ledger.closingBalance)}
            </span>
            <span className="ml-2 text-sm text-gray-500">
              {ledger.closingBalance >= 0 ? 'Dr' : 'Cr'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* Ledger Properties */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Info className="w-5 h-5 mr-2" />
          Ledger Properties
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-600">Parent Group</label>
            <p className="text-base text-gray-900 mt-1">{ledger.parent}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Tax Type</label>
            <p className="text-base text-gray-900 mt-1">{ledger.taxType || 'Not specified'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Master ID</label>
            <p className="text-base text-gray-900 mt-1">{ledger.masterId}</p>
          </div>
        </div>
      </div>

      {/* Configuration Flags */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Building className="w-5 h-5 mr-2" />
          Configuration Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="flex items-center">
            {getBooleanIcon(ledger.isBillWiseOn)}
            <span className="ml-3 text-sm text-gray-700">Bill-wise Details</span>
          </div>
          <div className="flex items-center">
            {getBooleanIcon(ledger.isCostCentresOn)}
            <span className="ml-3 text-sm text-gray-700">Cost Centres</span>
          </div>
          <div className="flex items-center">
            {getBooleanIcon(ledger.isRevenue)}
            <span className="ml-3 text-sm text-gray-700">Revenue Ledger</span>
          </div>
          <div className="flex items-center">
            {getBooleanIcon(ledger.isDeemedPositive)}
            <span className="ml-3 text-sm text-gray-700">Deemed Positive</span>
          </div>
          <div className="flex items-center">
            {getBooleanIcon(ledger.canDelete)}
            <span className="ml-3 text-sm text-gray-700">Can Delete</span>
          </div>
          <div className="flex items-center">
            {getBooleanIcon(ledger.forPayroll)}
            <span className="ml-3 text-sm text-gray-700">Payroll Ledger</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTransactionsTab = () => (
    <div className="space-y-6">
      {/* Date Range and Search */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="space-y-4">
          {/* All Time Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium text-gray-900">Transaction Filter</h4>
              <p className="text-sm text-gray-600">Choose date range or fetch all transactions</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-700">All Time</span>
              <button
                onClick={() => setIsAllTime(!isAllTime)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAllTime ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAllTime ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Date Range Selection */}
          <div className={`transition-opacity duration-200 ${isAllTime ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {/* Quick Date Presets */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Current Month', value: 'currentMonth' },
                  { label: 'Last Month', value: 'lastMonth' },
                  { label: 'Current Year', value: 'currentYear' },
                  { label: 'Last Year', value: 'lastYear' },
                ].map((preset) => (
                  <motion.button
                    key={preset.value}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setDateRange(preset.value as 'currentMonth' | 'lastMonth' | 'currentYear' | 'lastYear')}
                    disabled={isAllTime}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {preset.label}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end lg:space-x-4 space-y-4 lg:space-y-0">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    disabled={isAllTime}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    disabled={isAllTime}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fetch Button */}
          <div className="flex justify-end">
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchTransactions}
              disabled={loading}
              className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Fetching...' : `Fetch ${isAllTime ? 'All' : 'Filtered'} Transactions`}
            </motion.button>
          </div>
        </div>

        {/* Search */}
        {transactions.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by voucher number, party, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-3" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {filteredTransactions.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Transactions ({filteredTransactions.length})
              </h3>
              {isAllTime ? (
                <p className="text-sm text-gray-600">Showing all available transactions</p>
              ) : (
                <p className="text-sm text-gray-600">
                  From {fromDate} to {toDate}
                </p>
              )}
            </div>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </motion.button>
          </div>

          <div className="space-y-2">
            {filteredTransactions.map((transaction, index) => (
              <motion.div
                key={`${transaction.voucherNumber}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{transaction.voucherNumber}</h4>
                      <p className="text-sm text-gray-600">{transaction.voucherType}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">{formatCurrency(transaction.amount)}</p>
                    <p className="text-sm text-gray-500">{transaction.date}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Party:</span>
                    <span className="text-sm text-gray-900">{transaction.partyName}</span>
                  </div>
                  
                  {transaction.ledgerEntries.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Ledger Entries:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {transaction.ledgerEntries.map((entry, entryIndex) => (
                          <div key={entryIndex} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                            <span className="text-gray-700 truncate">{entry.ledgerName}</span>
                            <span className={`font-medium ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(entry.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {transaction.inventoryEntries && transaction.inventoryEntries.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Inventory Items:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {transaction.inventoryEntries.map((entry, entryIndex) => (
                          <div key={entryIndex} className="flex items-center justify-between text-xs bg-blue-50 p-2 rounded">
                            <div className="flex-1 truncate">
                              <span className="text-gray-700 font-medium">{entry.stockName}</span>
                              {entry.quantity > 0 && (
                                <span className="text-gray-500 ml-2">
                                  {entry.quantity}{entry.unit ? ` ${entry.unit}` : ''}
                                  {entry.rate > 0 && ` @ ${formatCurrency(entry.rate)}`}
                                </span>
                              )}
                            </div>
                            <span className="font-medium text-blue-600 ml-2">
                              {formatCurrency(entry.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : transactions.length === 0 && !loading && !error ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions</h3>
          <p className="text-gray-600">Click "Fetch Transactions" to load voucher data for the selected date range.</p>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <motion.button
              whileHover={{ x: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={onBack}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to List
            </motion.button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{ledger.name}</h1>
              <p className="text-gray-600">Ledger Details & Transactions</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Current Balance</p>
            <p className={`text-2xl font-bold ${getBalanceColor(ledger.closingBalance)}`}>
              {formatCurrency(ledger.closingBalance)}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-6">
          {[
            { id: 'details', label: 'Details', icon: Building },
            { id: 'transactions', label: 'Transactions', icon: FileText }
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id as 'details' | 'transactions')}
              className={`inline-flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'details' ? renderDetailsTab() : renderTransactionsTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LedgerDetails;
