import React, { useState, useCallback, useMemo, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Search, Download, Eye, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { SalesVoucher } from '../../../services/api/sales/salesApiService';
import { formatCurrency } from '../../../shared/utils/formatters';

interface VirtualSalesTableProps {
  vouchers: SalesVoucher[];
  totalCount: number;
  loading: boolean;
  onLoadMore: (page: number) => void;
  onSearch: (searchTerm: string) => void;
  onRefresh: () => void;
  onViewDetails: (voucher: SalesVoucher) => void;
  currentPage: number;
  pageSize: number;
}

const ITEM_HEIGHT = 60; // Height of each row in pixels
const VISIBLE_ROWS = 15; // Number of rows visible at once

const VirtualSalesTable: React.FC<VirtualSalesTableProps> = ({
  vouchers,
  totalCount,
  loading,
  onLoadMore,
  onSearch,
  onRefresh,
  onViewDetails,
  currentPage,
  pageSize,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVouchers, setSelectedVouchers] = useState<Set<string>>(new Set());
  const listRef = useRef<List>(null);
  const searchTimeoutRef = useRef<number>();

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      onSearch(value);
    }, 300) as unknown as number;
  }, [onSearch]);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / pageSize);

  // Handle page navigation
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      onLoadMore(page);
      // Scroll to top when changing pages
      if (listRef.current) {
        listRef.current.scrollToItem(0, 'start');
      }
    }
  }, [onLoadMore, totalPages]);

  // Handle voucher selection
  const handleVoucherSelection = useCallback((voucherId: string, selected: boolean) => {
    setSelectedVouchers(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(voucherId);
      } else {
        newSet.delete(voucherId);
      }
      return newSet;
    });
  }, []);

  // Select all vouchers on current page
  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      const currentPageVouchers = vouchers.map(v => v.id);
      setSelectedVouchers(prev => new Set([...prev, ...currentPageVouchers]));
    } else {
      const currentPageVouchers = new Set(vouchers.map(v => v.id));
      setSelectedVouchers(prev => new Set([...prev].filter(id => !currentPageVouchers.has(id))));
    }
  }, [vouchers]);

  // Export selected vouchers
  const handleExport = useCallback(() => {
    if (selectedVouchers.size === 0) {
      alert('Please select vouchers to export');
      return;
    }

    const selectedData = vouchers.filter(v => selectedVouchers.has(v.id));
    const csvContent = [
      ['Voucher Number', 'Date', 'Party Name', 'Amount', 'Voucher Type', 'Reference', 'Narration'].join(','),
      ...selectedData.map(v => [
        v.voucherNumber,
        v.date,
        v.partyName,
        v.amount.toString(),
        v.voucherType,
        v.reference,
        v.narration.replace(/,/g, ';')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-vouchers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedVouchers, vouchers]);

  // Row renderer for virtual list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const voucher = vouchers[index];
    
    if (!voucher) {
      return (
        <div style={style} className="flex items-center justify-center h-full bg-gray-50">
          <div className="animate-pulse bg-gray-200 h-8 w-full rounded mx-4"></div>
        </div>
      );
    }

    const isSelected = selectedVouchers.has(voucher.id);

    return (
      <div 
        style={style} 
        className={`grid grid-cols-12 gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
          isSelected ? 'bg-blue-50 border-blue-200' : ''
        }`}
      >
        {/* Selection checkbox */}
        <div className="col-span-1 flex items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleVoucherSelection(voucher.id, e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
        </div>

        {/* Voucher Number */}
        <div className="col-span-2 flex items-center">
          <div>
            <span className="text-sm font-medium text-gray-900 block truncate">
              {voucher.voucherNumber}
            </span>
            <span className="text-xs text-gray-500">
              {voucher.voucherType}
            </span>
          </div>
        </div>

        {/* Date */}
        <div className="col-span-2 flex items-center">
          <span className="text-sm text-gray-600">
            {voucher.date}
          </span>
        </div>

        {/* Party Name */}
        <div className="col-span-3 flex items-center">
          <span className="text-sm text-gray-800 truncate" title={voucher.partyName}>
            {voucher.partyName}
          </span>
        </div>

        {/* Amount */}
        <div className="col-span-2 flex items-center justify-end">
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(voucher.amount)}
          </span>
        </div>

        {/* Reference */}
        <div className="col-span-1 flex items-center">
          <span className="text-xs text-gray-500 truncate" title={voucher.reference}>
            {voucher.reference || '-'}
          </span>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex items-center justify-center">
          <button 
            className="text-blue-600 hover:text-blue-800 transition-colors p-1 rounded hover:bg-blue-100"
            title="View Details"
            onClick={() => onViewDetails(voucher)}
          >
            <Eye size={16} />
          </button>
        </div>
      </div>
    );
  }, [vouchers, selectedVouchers, handleVoucherSelection, onViewDetails]);

  // Header component
  const TableHeader = useMemo(() => (
    <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 font-medium text-xs text-gray-500 uppercase tracking-wider sticky top-0 z-10">
      <div className="col-span-1 flex items-center">
        <input
          type="checkbox"
          checked={vouchers.length > 0 && vouchers.every(v => selectedVouchers.has(v.id))}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
      </div>
      <div className="col-span-2">Voucher</div>
      <div className="col-span-2">Date</div>
      <div className="col-span-3">Party Name</div>
      <div className="col-span-2 text-right">Amount</div>
      <div className="col-span-1">Reference</div>
      <div className="col-span-1 text-center">Actions</div>
    </div>
  ), [vouchers, selectedVouchers, handleSelectAll]);

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by party name or voucher number..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg transition-colors"
          >
            <RefreshCw size={20} className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={handleExport}
            disabled={selectedVouchers.size === 0}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Download size={20} className="mr-2" />
            Export ({selectedVouchers.size})
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Total Records</p>
          <p className="text-2xl font-bold text-gray-900">{totalCount.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Current Page</p>
          <p className="text-2xl font-bold text-gray-900">{currentPage} of {totalPages}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Selected</p>
          <p className="text-2xl font-bold text-blue-600">{selectedVouchers.size}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">Page Size</p>
          <p className="text-2xl font-bold text-gray-900">{pageSize}</p>
        </div>
      </div>

      {/* Virtual Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {TableHeader}
        
        {loading && vouchers.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="animate-spin mx-auto mb-4 text-gray-400" size={32} />
              <p className="text-gray-600">Loading sales data...</p>
            </div>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-600">No sales vouchers found</p>
              <p className="text-sm text-gray-400 mt-2">Try adjusting your search criteria</p>
            </div>
          </div>
        ) : (
          <List
            ref={listRef}
            height={ITEM_HEIGHT * Math.min(VISIBLE_ROWS, vouchers.length)}
            itemCount={vouchers.length}
            itemSize={ITEM_HEIGHT}
            overscanCount={5}
            width="100%"
          >
            {Row}
          </List>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {vouchers.length} of {totalCount.toLocaleString()} vouchers
            {selectedVouchers.size > 0 && (
              <span className="ml-2 text-blue-600">
                • {selectedVouchers.size} selected
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || loading}
              className="flex items-center px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} className="mr-1" />
              Previous
            </button>
            
            <span className="px-3 py-1 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || loading}
              className="flex items-center px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={16} className="ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading overlay for additional data */}
      {loading && vouchers.length > 0 && (
        <div className="text-center py-4">
          <RefreshCw className="animate-spin mx-auto mb-2 text-blue-500" size={24} />
          <p className="text-sm text-gray-600">Loading more data...</p>
        </div>
      )}
    </div>
  );
};

export default VirtualSalesTable;
