import React, { useState, useEffect } from 'react';
import { X, Package, FileText, Calendar, User, Receipt } from 'lucide-react';
import SalesApiService from '../../../services/api/sales/salesApiService';
import { useCompany } from '../../../context/CompanyContext';

interface VoucherDetail {
  guid: string;
  number: string;
  date: string;
  party: string;
  address: string[];
  partyGstin: string;
  placeOfSupply: string;
  amount: number;
  items: Array<{
    stockItem: string;
    hsn: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
    discount: number;
  }>;
  gstDetails: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
  taxableAmount: number;
  totalTax: number;
  roundOff: number;
  finalAmount: number;
  reference: string;
  voucherType: string;
}

interface SimpleVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherGuid: string;
  voucherNumber: string;
}

export const SimpleVoucherModal: React.FC<SimpleVoucherModalProps> = ({
  isOpen,
  onClose,
  voucherGuid,
  voucherNumber
}) => {
  const [voucherDetail, setVoucherDetail] = useState<VoucherDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompany } = useCompany();
  
  const salesApiService = new SalesApiService();

  useEffect(() => {
    if (isOpen && voucherGuid && selectedCompany) {
      extractVoucherDetails();
    }
  }, [isOpen, voucherGuid, selectedCompany]);

    const extractVoucherDetails = async () => {
    if (!selectedCompany) {
      setError('No company selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log(`Extracting details for voucher: ${voucherNumber} (${voucherGuid})`);
      
      // Get voucher details from cached Day Book data
      const details = await salesApiService.getVoucherDetailsFromCache(voucherGuid);
      
      if (!details) {
        throw new Error('Voucher details not found');
      }
      
      setVoucherDetail(details);
    } catch (err) {
      console.error('Error extracting voucher details:', err);
      setError(err instanceof Error ? err.message : 'Failed to extract voucher details');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Tax Invoice Details</h2>
            <p className="text-sm text-gray-600">Voucher: {voucherNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading voucher details...</span>
            </div>
          )}

          {error && (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error loading details</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {voucherDetail && (
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <FileText className="mr-2" size={20} />
                    Invoice Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center">
                        <Receipt className="mr-2" size={16} />
                        Invoice Number:
                      </span>
                      <span className="font-medium">{voucherDetail.number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center">
                        <Calendar className="mr-2" size={16} />
                        Date:
                      </span>
                      <span className="font-medium">{voucherDetail.date}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 flex items-center">
                        <User className="mr-2" size={16} />
                        Party:
                      </span>
                      <span className="font-medium">{voucherDetail.party}</span>
                    </div>
                    {voucherDetail.partyGstin && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Party GSTIN:</span>
                        <span className="font-medium">{voucherDetail.partyGstin}</span>
                      </div>
                    )}
                    {voucherDetail.address && voucherDetail.address.length > 0 && (
                      <div className="flex flex-col">
                        <span className="text-gray-600 mb-1">Address:</span>
                        <div className="text-sm">
                          {voucherDetail.address.map((line, index) => (
                            <div key={index}>{line}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium">{voucherDetail.voucherType || 'Tax Invoice'}</span>
                    </div>
                    {voucherDetail.placeOfSupply && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Place of Supply:</span>
                        <span className="font-medium">{voucherDetail.placeOfSupply}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">
                    Amount Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Final Amount:</span>
                      <span className="text-2xl font-bold text-blue-600">₹{voucherDetail.finalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Taxable Amount:</span>
                      <span className="font-medium">₹{voucherDetail.taxableAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Total Tax:</span>
                      <span className="font-medium">₹{voucherDetail.totalTax.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Items Count:</span>
                      <span className="font-medium">{voucherDetail.items.length} items</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GST Breakdown */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">GST Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {voucherDetail.gstDetails.cgst > 0 && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">CGST</p>
                      <p className="text-lg font-semibold">₹{voucherDetail.gstDetails.cgst.toFixed(2)}</p>
                    </div>
                  )}
                  {voucherDetail.gstDetails.sgst > 0 && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">SGST</p>
                      <p className="text-lg font-semibold">₹{voucherDetail.gstDetails.sgst.toFixed(2)}</p>
                    </div>
                  )}
                  {voucherDetail.gstDetails.igst > 0 && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">IGST</p>
                      <p className="text-lg font-semibold">₹{voucherDetail.gstDetails.igst.toFixed(2)}</p>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total GST</p>
                    <p className="text-lg font-bold text-green-600">₹{voucherDetail.gstDetails.total.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Items Details */}
              {voucherDetail.items.length > 0 && (
                <div className="bg-white border rounded-lg">
                  <div className="px-4 py-3 border-b bg-gray-50">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Package className="mr-2" size={20} />
                      Items Billed ({voucherDetail.items.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Item Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            HSN Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Rate
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {voucherDetail.items.map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {item.stockItem}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.hsn || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ₹{item.rate.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                              ₹{item.amount.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {voucherDetail.items.length === 0 && (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Found</h3>
                  <p className="text-gray-600">
                    Item details are not available in the current data. 
                    This might be a non-inventory voucher or the data structure may be different.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleVoucherModal;
