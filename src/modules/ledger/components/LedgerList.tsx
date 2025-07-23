import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, TrendingUp, TrendingDown, RefreshCw, ArrowRight, Clock } from 'lucide-react';
import { TallyLedger } from '../../../services/api/ledger/ledgerApiService';

interface LedgerListProps {
  cachedLedgers: TallyLedger[];
  isInitialLoading: boolean;
  onLedgerSelect: (ledger: TallyLedger) => void;
  onRefresh: () => void;
  lastFetchTime: number | null;
}

const LedgerList: React.FC<LedgerListProps> = ({ 
  cachedLedgers, 
  isInitialLoading, 
  onLedgerSelect, 
  onRefresh, 
  lastFetchTime 
}) => {
  const [filteredLedgers, setFilteredLedgers] = useState<TallyLedger[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'positive' | 'negative'>('all');

  useEffect(() => {
    filterLedgers();
  }, [cachedLedgers, searchTerm, selectedFilter]);

  const filterLedgers = () => {
    let filtered = cachedLedgers;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(ledger =>
        ledger.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ledger.parent.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by balance type
    if (selectedFilter === 'positive') {
      filtered = filtered.filter(ledger => ledger.closingBalance > 0);
    } else if (selectedFilter === 'negative') {
      filtered = filtered.filter(ledger => ledger.closingBalance < 0);
    }

    setFilteredLedgers(filtered);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const formatLastFetch = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getBalanceStats = () => {
    const totalLedgers = cachedLedgers.length;
    const positiveLedgers = cachedLedgers.filter(l => l.closingBalance > 0).length;
    const negativeLedgers = cachedLedgers.filter(l => l.closingBalance < 0).length;
    const zeroLedgers = totalLedgers - positiveLedgers - negativeLedgers;

    return { totalLedgers, positiveLedgers, negativeLedgers, zeroLedgers };
  };

  const stats = getBalanceStats();

  if (isInitialLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Ledgers</h3>
          <p className="text-gray-600">Fetching ledger data from Tally...</p>
        </div>
      </div>
    );
  }

  if (cachedLedgers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Ledgers Found</h3>
          <p className="text-gray-600 mb-4">
            No ledger accounts were found in this company. This might be because:
          </p>
          <ul className="text-sm text-gray-500 text-left space-y-1 mb-6">
            <li>• The company has no ledger accounts created</li>
            <li>• There was an issue connecting to Tally</li>
            <li>• The company data is not accessible</li>
          </ul>
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRefresh}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 mb-6 px-6 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ledger Accounts</h1>
            <p className="text-gray-600">Manage and view your financial ledger accounts</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-500">
              <Clock className="w-4 h-4 inline mr-1" />
              Last updated: {formatLastFetch(lastFetchTime)}
            </div>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={onRefresh}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </motion.button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <motion.div 
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
            whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.1)" }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg mr-3 flex-shrink-0">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-600 truncate">Total Ledgers</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalLedgers}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
            whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.1)" }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg mr-3 flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-600 truncate">Positive Balance</p>
                <p className="text-xl font-bold text-green-600">{stats.positiveLedgers}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
            whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.1)" }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg mr-3 flex-shrink-0">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-600 truncate">Negative Balance</p>
                <p className="text-xl font-bold text-red-600">{stats.negativeLedgers}</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"
            whileHover={{ y: -2, boxShadow: "0 8px 25px -5px rgba(0, 0, 0, 0.1)" }}
          >
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg mr-3 flex-shrink-0">
                <div className="w-5 h-5 bg-gray-500 rounded-full" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-600 truncate">Zero Balance</p>
                <p className="text-xl font-bold text-gray-600">{stats.zeroLedgers}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search ledgers by name or parent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {['all', 'positive', 'negative'].map((filter) => (
              <motion.button
                key={filter}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedFilter(filter as 'all' | 'positive' | 'negative')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedFilter === filter
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {filter === 'all' ? 'All' : filter === 'positive' ? 'Positive' : 'Negative'}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Ledger List */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <AnimatePresence>
          {filteredLedgers.length > 0 ? (
            <div className="space-y-2">
              {filteredLedgers.map((ledger, index) => (
                <motion.div
                  key={ledger.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.02 }}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group"
                  onClick={() => onLedgerSelect(ledger)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-2">
                        <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                          {ledger.name}
                        </h3>
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200 ml-2 flex-shrink-0" />
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        Parent: {ledger.parent}
                      </p>
                    </div>

                    <div className="text-right ml-4 flex-shrink-0">
                      <div className="flex items-center justify-end mb-1">
                        {ledger.closingBalance > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                        ) : ledger.closingBalance < 0 ? (
                          <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                        ) : (
                          <div className="w-4 h-4 mr-1" />
                        )}
                        <span className={`text-base font-bold ${
                          ledger.closingBalance > 0 ? 'text-green-600' : 
                          ledger.closingBalance < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {formatCurrency(ledger.closingBalance)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {ledger.closingBalance >= 0 ? 'Dr' : 'Cr'}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-64"
            >
              <div className="text-center">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
                <p className="text-gray-600">
                  No ledgers match your current search and filter criteria.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LedgerList;
