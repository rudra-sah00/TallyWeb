import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ChevronRight, DollarSign, Package2, TrendingUp, Info } from 'lucide-react';
import { StockItem } from '../../../services/api/inventory/inventoryApiService';

interface StockItemsListProps {
  items: StockItem[];
  loading: boolean;
  searchTerm: string;
}

interface StockItemDetailsModalProps {
  item: StockItem;
  isOpen: boolean;
  onClose: () => void;
}

const StockItemDetailsModal: React.FC<StockItemDetailsModalProps> = ({ item, isOpen, onClose }) => {
  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current body overflow and prevent scrolling
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      
      // Cleanup function to restore scrolling when modal closes
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasStock = item.closingBalance && parseFloat(item.closingBalance.replace(/[^\d.-]/g, '')) > 0;
  const closingValue = parseFloat(item.closingValue.replace(/[^\d.-]/g, '')) || 0;
  const openingValue = parseFloat(item.openingValue.replace(/[^\d.-]/g, '')) || 0;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onWheel={(e) => e.preventDefault()}
      onTouchMove={(e) => e.preventDefault()}
      style={{ touchAction: 'none' }}
      onClick={(e) => {
        // Close modal if clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Prevent modal content clicks from closing modal
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                hasStock ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Package className={`w-5 h-5 ${hasStock ? 'text-green-600' : 'text-gray-500'}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{item.name}</h2>
                {item.languageName && item.languageName !== item.name && (
                  <p className="text-sm text-gray-500">{item.languageName}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              hasStock 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {hasStock ? 'In Stock' : 'Out of Stock'}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {item.baseUnits}
            </span>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Package2 className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Current Stock</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {item.closingBalance || '0'}
              </p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Current Value</span>
              </div>
              <p className="text-2xl font-bold text-green-900 mt-1">
                ₹{Math.abs(closingValue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Standard Cost</span>
              </div>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {item.standardCost || 'N/A'}
              </p>
            </div>
          </div>

          {/* Detailed Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Detailed Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Opening Balance:</span>
                <span className="ml-2 font-medium">{item.openingBalance || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Opening Value:</span>
                <span className="ml-2 font-medium">
                  {openingValue ? `₹${Math.abs(openingValue).toLocaleString('en-IN')}` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Standard Price:</span>
                <span className="ml-2 font-medium">{item.standardPrice || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Base Units:</span>
                <span className="ml-2 font-medium">{item.baseUnits}</span>
              </div>
            </div>
          </div>

          {/* Value Analysis */}
          {(openingValue !== 0 || closingValue !== 0) && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-yellow-900 mb-2">Value Analysis</h3>
              <div className="text-sm text-yellow-800">
                {closingValue > openingValue ? (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Value increased by ₹{Math.abs(closingValue - openingValue).toLocaleString('en-IN')}
                  </span>
                ) : closingValue < openingValue ? (
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-red-600 transform rotate-180" />
                    Value decreased by ₹{Math.abs(openingValue - closingValue).toLocaleString('en-IN')}
                  </span>
                ) : (
                  <span>No change in value</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const StockItemsList: React.FC<StockItemsListProps> = ({ items, loading, searchTerm }) => {
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading stock items...</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-lg border border-gray-200 p-8 text-center"
      >
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {searchTerm ? 'No stock items found' : 'No stock items available'}
        </h3>
        <p className="text-gray-500">
          {searchTerm
            ? `No stock items match "${searchTerm}"`
            : 'No stock items are currently available in the system.'}
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg border border-gray-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">Stock Items</h2>
            </div>
            <div className="text-sm text-gray-500">
              {items.length} {items.length === 1 ? 'item' : 'items'}
              {searchTerm && ` matching "${searchTerm}"`}
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="divide-y divide-gray-100">
          {items.map((item, index) => {
            const hasStock = item.closingBalance && parseFloat(item.closingBalance.replace(/[^\d.-]/g, '')) > 0;
            const closingValue = parseFloat(item.closingValue.replace(/[^\d.-]/g, '')) || 0;
            
            return (
              <motion.div
                key={`${item.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        hasStock ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {item.name}
                        </h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-gray-500">
                            {item.baseUnits}
                          </span>
                          {item.closingBalance && (
                            <span className="text-xs text-blue-600 font-medium">
                              Stock: {item.closingBalance}
                            </span>
                          )}
                          {closingValue !== 0 && (
                            <span className="text-xs text-green-600 font-medium">
                              Value: ₹{Math.abs(closingValue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Info footer for large datasets */}
        {items.length > 1000 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600 text-center">
              Displaying all {items.length.toLocaleString()} items. Use search above to find specific items quickly.
            </p>
          </div>
        )}
      </motion.div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedItem && (
          <StockItemDetailsModal
            item={selectedItem}
            isOpen={!!selectedItem}
            onClose={() => setSelectedItem(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default StockItemsList;
