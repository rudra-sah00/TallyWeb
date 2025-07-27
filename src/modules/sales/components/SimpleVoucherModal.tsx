import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  AlertTriangle, 
  Loader2, 
  Share2, 
  MessageCircle, 
  Mail, 
  ChevronDown,
  FileSpreadsheet,
  Calendar,
  User,
  Receipt,
  ShoppingCart,
  Package,
  DollarSign,
  Percent
} from 'lucide-react';
import { SalesApiService } from '../../../services/api/sales/salesApiService';
import { useCompany } from '../../../context/CompanyContext';
import CompanyApiService, { TallyCompanyDetails } from '../../../services/api/company/companyApiService';
import LedgerApiService from '../../../services/api/ledger/ledgerApiService';
import { PDFGenerator } from '../../../utils/exportUtils/pdfGenerator';

interface StockItem {
  stockItem: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  discount?: number;
  discountPercent?: number;
}

interface GSTBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  total: number;
}

interface VoucherDetail {
  guid: string;
  number: string;
  date: string;
  party: string;
  address: string[];
  partyGstin: string;
  placeOfSupply: string;
  amount: number;
  items: StockItem[];
  gstDetails: GSTBreakdown;
  taxableAmount: number;
  totalTax: number;
  roundOff: number;
  finalAmount: number;
  reference: string;
  narration: string;
  voucherType: string;
  totalDiscount?: number;
  // Additional comprehensive details
  subTotal: number;
  netAmount: number;
  savings?: number;
}

interface SimpleVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucherGuid: string;
  voucherNumber: string;
  voucherData?: any; // Add the complete voucher data from the list
}

export const SimpleVoucherModal: React.FC<SimpleVoucherModalProps> = ({
  isOpen,
  onClose,
  voucherGuid,
  voucherNumber,
  voucherData
}) => {
  const [voucherDetail, setVoucherDetail] = useState<VoucherDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { selectedCompany } = useCompany();
  const [exporting, setExporting] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<TallyCompanyDetails | null>(null);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyLoadAttempted, setCompanyLoadAttempted] = useState(false);
  const [partyDetails, setPartyDetails] = useState<any>(null); // You can type this better if needed
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [currentPdfBlob, setCurrentPdfBlob] = useState<Blob | null>(null);

  const salesApiService = new SalesApiService();

  useEffect(() => {
    if (isOpen) {
      if (voucherData && voucherData.stockItems) {
        // Use the data that's already available from the voucher list
        extractVoucherDetailsFromExistingData();
      } else if (voucherGuid && selectedCompany) {
        // Fallback to API call if data not available
        extractVoucherDetails();
      }
    }
  }, [isOpen, voucherGuid, selectedCompany, voucherData]);

  useEffect(() => {
    console.log('Company details useEffect triggered:', { isOpen, selectedCompany, companyLoadAttempted });
    
    if (isOpen && selectedCompany && !companyLoadAttempted) {
      console.log('Fetching company details for:', selectedCompany);
      // Fetch company details only once per company
      const api = new CompanyApiService();
      setCompanyDetails(null); // Reset to show loading state
      setCompanyLoading(true);
      setCompanyLoadAttempted(true);
      
      api.getCompanyDetails(selectedCompany).then(details => {
        console.log('Raw company details from API:', details);
        
        if (!details) {
          console.error('No company details returned from API');
          setCompanyDetails(null);
          setCompanyLoading(false);
          return;
        }

        // Normalize all keys to lowerCamelCase
        const toCamel = (str: string) => {
          return str
            .toLowerCase()
            .replace(/[-_\.]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
            .replace(/^([a-z])/, (m) => m.toLowerCase());
        };
        const normalizeKeys = (obj: any): any => {
          if (!obj || typeof obj !== 'object') return obj;
          if (Array.isArray(obj)) return obj.map((v: any) => normalizeKeys(v));
          return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [toCamel(k), normalizeKeys(v)])
          );
        };
        const normalizedDetails = normalizeKeys(details);
        setCompanyDetails(normalizedDetails);
        setCompanyLoading(false);
        console.log('✅ Company details loaded successfully:', normalizedDetails);
      }).catch(error => {
        console.error('❌ Error fetching company details:', error);
        setCompanyDetails(null);
        setCompanyLoading(false);
      });
    } else if (!isOpen) {
      // Reset when modal closes
      setCompanyLoadAttempted(false);
    } else {
      console.log('Skipping company details fetch:', { isOpen, selectedCompany, companyLoadAttempted, alreadyLoaded: !!companyDetails });
      if (!isOpen) {
        setCompanyDetails(null);
        setCompanyLoading(false);
      }
    }
  }, [isOpen, selectedCompany, companyLoadAttempted]);

  useEffect(() => {
    if (voucherDetail?.party && selectedCompany) {
      const api = new LedgerApiService();
      api.getLedgerDetails(voucherDetail.party, selectedCompany).then(setPartyDetails).catch(() => setPartyDetails(null));
    }
  }, [voucherDetail?.party, selectedCompany]);

  const extractVoucherDetailsFromExistingData = () => {
    try {
      setLoading(true);
      setError(null);
      console.log(`Using existing data for voucher: ${voucherNumber}`, voucherData);
      
      // Map the existing voucher data to the expected format
      const subTotal = (voucherData.stockItems || []).reduce((sum: number, item: any) => sum + item.amount, 0);
      const totalDiscount = voucherData.totalDiscount || 0;
      const totalTax = voucherData.gstBreakdown?.total || voucherData.totalTax || 0;
      const roundOff = voucherData.roundOff || 0;
      const netAmount = subTotal + totalTax + roundOff;
      const savings = totalDiscount;
      
      const mappedDetails: VoucherDetail = {
        guid: voucherData.guid || voucherGuid,
        number: voucherData.voucherNumber || voucherNumber,
        date: voucherData.date,
        party: voucherData.partyName,
        address: [], // Not available in basic data
        partyGstin: '', // Not available in basic data
        placeOfSupply: '', // Not available in basic data
        amount: voucherData.amount,
        items: (voucherData.stockItems || []).map((item: any) => ({
          stockItem: item.name,
          hsn: item.hsn || 'N/A',
          quantity: parseFloat(item.billedQty?.replace(/[^\d.-]/g, '') || '0'),
          unit: item.billedQty?.replace(/[0-9.-\s]/g, '') || '',
          rate: parseFloat(item.rate?.replace(/[^\d.-]/g, '') || '0'),
          amount: item.amount,
          discount: item.discount || 0,
          discountPercent: item.discountPercent || 0
        })),
        gstDetails: {
          cgst: voucherData.gstBreakdown?.cgst || 0,
          sgst: voucherData.gstBreakdown?.sgst || 0,
          igst: voucherData.gstBreakdown?.igst || 0,
          cgstRate: voucherData.gstBreakdown?.cgstRate || 0,
          sgstRate: voucherData.gstBreakdown?.sgstRate || 0,
          igstRate: voucherData.gstBreakdown?.igstRate || 0,
          total: totalTax
        },
        taxableAmount: voucherData.taxableAmount || subTotal,
        totalTax: totalTax,
        roundOff: roundOff,
        finalAmount: voucherData.amount,
        reference: voucherData.reference || '',
        narration: voucherData.narration || '',
        voucherType: voucherData.voucherType,
        totalDiscount: totalDiscount,
        subTotal: subTotal,
        netAmount: netAmount,
        savings: savings > 0 ? savings : undefined
      };
      
      setVoucherDetail(mappedDetails);
      console.log('✅ Voucher details mapped from existing data');
      
    } catch (err) {
      console.error('Error mapping existing voucher data:', err);
      setError('Failed to process voucher data');
    } finally {
      setLoading(false);
    }
  };

  const extractVoucherDetails = async () => {
    if (!selectedCompany) {
      setError('No company selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log(`Fetching details for voucher: ${voucherNumber} (${voucherGuid})`);
      
      // Fetch voucher details directly from Tally
      const details = await salesApiService.fetchVoucherDetails(selectedCompany, voucherGuid);
      
      if (!details) {
        throw new Error('Voucher details not found');
      }
      
      setVoucherDetail(details);
      
    } catch (err) {
      console.error('Error fetching voucher details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch voucher details');
    } finally {
      setLoading(false);
    }
  };

  // --- Export Handlers ---
  const handleExportPDF = async () => {
    if (!voucherDetail) {
      setError('No voucher data available for export');
      return;
    }

    setExporting(true);

    try {
      console.log('Starting PDF export...');
      console.log('Company details available:', !!companyDetails);
      
      // Check if company details are still loading
      if (companyLoading) {
        setError('Company details are still loading. Please wait a moment and try again.');
        setExporting(false);
        return;
      }
      
      if (!companyDetails && selectedCompany) {
        setError('Company details are not loaded. Please click the refresh button (🔄) and try again.');
        setExporting(false);
        return;
      }
      
      // Clear any previous errors
      setError(null);
      
      // Validate company details before PDF generation
      const validationErrors = PDFGenerator.validateCompanyDetails(companyDetails);
      if (validationErrors.length > 0) {
        console.error('PDF validation failed:', validationErrors);
        setError(`Cannot generate PDF: ${validationErrors.join(', ')}`);
        return;
      }

      console.log('PDF validation passed, generating PDF...');

      // Generate PDF using the modular PDF generator
      const pdfGenerator = new PDFGenerator();
      const pdfBlob = await pdfGenerator.generateInvoicePDF({
        voucher: voucherDetail,
        companyDetails: companyDetails!,
        partyDetails,
        fileName: `Invoice_${voucherDetail.number}.pdf`
      });

      console.log('PDF generated successfully');

      // Store the PDF blob for sharing
      setCurrentPdfBlob(pdfBlob);

      // Download the PDF directly
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${voucherDetail.number}.pdf`;
      link.click();
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  // Export Excel function
  const handleExportExcel = async () => {
    if (!voucherDetail || !companyDetails) {
      setError('Voucher or company details not available for Excel export');
      return;
    }
    
    setExcelLoading(true);
    try {
      // Create a simple Excel export with voucher data
      const data = [
        ['Invoice Details'],
        ['Number:', voucherDetail.number],
        ['Date:', voucherDetail.date],
        ['Party:', voucherDetail.party],
        ['Amount:', voucherDetail.finalAmount],
        [''],
        ['Items:'],
        ['Description', 'Quantity', 'Rate', 'Amount'],
        ...voucherDetail.items.map(item => [
          item.stockItem,
          item.quantity,
          item.rate,
          item.amount
        ]),
        [''],
        ['Total Amount:', voucherDetail.finalAmount]
      ];
      
      // For now, just log the data - you can implement proper Excel generation later
      console.log('Excel data prepared:', data);
      alert('Excel export functionality will be implemented soon');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      setError('Failed to export Excel file');
    } finally {
      setExcelLoading(false);
    }
  };

  // Share PDF via WhatsApp
  const handleShareWhatsApp = async () => {
    if (!voucherDetail) {
      setError('No voucher data available for sharing');
      return;
    }

    try {
      // Create WhatsApp message with invoice details
      const message = encodeURIComponent(`Hi! 📧

Here's your invoice details:

🧾 *Invoice #${voucherDetail.number}*
📅 Date: ${voucherDetail.date}
👤 Customer: ${voucherDetail.party}
💰 Amount: ₹${voucherDetail.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}

📋 *GST Breakdown:*
• CGST (${voucherDetail.gstDetails.cgstRate}%): ₹${voucherDetail.gstDetails.cgst.toFixed(2)}
• SGST (${voucherDetail.gstDetails.sgstRate}%): ₹${voucherDetail.gstDetails.sgst.toFixed(2)}
${voucherDetail.gstDetails.igst > 0 ? `• IGST (${voucherDetail.gstDetails.igstRate}%): ₹${voucherDetail.gstDetails.igst.toFixed(2)}` : ''}
• Total GST: ₹${voucherDetail.gstDetails.total.toFixed(2)}

Thank you for your business! 🙏`);

      // Open WhatsApp with the message
      const whatsappUrl = `https://wa.me/?text=${message}`;
      window.open(whatsappUrl, '_blank');
      
      setShowShareDropdown(false);
    } catch (err) {
      console.error('WhatsApp share error:', err);
      setError('Failed to share via WhatsApp');
    }
  };

  // Share PDF via Email
  const handleShareEmail = async () => {
    if (!currentPdfBlob || !voucherDetail) {
      // Generate PDF first if not available
      await handleExportPDF();
      if (!currentPdfBlob || !voucherDetail) return;
    }

    try {
      const fileName = `Invoice_${voucherDetail!.number}.pdf`;
      const file = new File([currentPdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        // Use Web Share API if available (works on mobile)
        await navigator.share({
          title: `Invoice ${voucherDetail!.number}`,
          text: `Please find the invoice ${voucherDetail!.number} attached.`,
          files: [file]
        });
      } else {
        // Fallback: Create mailto URL with invoice details
        const subject = encodeURIComponent(`Invoice ${voucherDetail!.number} - ₹${voucherDetail!.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        const body = encodeURIComponent(`Dear Customer,

Please find the invoice details below:

Invoice Number: ${voucherDetail!.number}
Date: ${voucherDetail!.date}
Customer: ${voucherDetail!.party}
Amount: ₹${voucherDetail!.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}

GST Breakdown:
• CGST (${voucherDetail!.gstDetails.cgstRate}%): ₹${voucherDetail!.gstDetails.cgst.toFixed(2)}
• SGST (${voucherDetail!.gstDetails.sgstRate}%): ₹${voucherDetail!.gstDetails.sgst.toFixed(2)}
${voucherDetail!.gstDetails.igst > 0 ? `• IGST (${voucherDetail!.gstDetails.igstRate}%): ₹${voucherDetail!.gstDetails.igst.toFixed(2)}` : ''}
• Total GST: ₹${voucherDetail!.gstDetails.total.toFixed(2)}

Items:
${voucherDetail!.items.map(item => `• ${item.stockItem}: ${item.quantity.toFixed(2)} ${item.unit} @ ₹${item.rate.toFixed(2)} = ₹${item.amount.toFixed(2)}`).join('\n')}

Note: Please download the PDF attachment for the complete invoice with detailed formatting.

Best regards,
${companyDetails?.name || companyDetails?.basiccompanyformalname || 'Your Company'}`);
        
        const mailtoUrl = `mailto:?subject=${subject}&body=${body}`;
        window.open(mailtoUrl);
        
        // Also trigger download for manual attachment
        const url = URL.createObjectURL(currentPdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
      }
      setShowShareDropdown(false);
    } catch (err) {
      console.error('Email share error:', err);
      setError('Failed to share via email');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full h-[95vh] flex flex-col overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold">Tax Invoice Details</h2>
            <p className="text-blue-100">Voucher: {voucherNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {(loading || companyLoading) && (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-6" />
                <span className="text-xl text-gray-700 font-medium">Loading...</span>
                <p className="text-sm text-gray-500 mt-3">Please wait while we prepare your invoice</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <div className="text-red-600 text-lg font-medium mb-2">Error Loading Voucher</div>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Only show voucher details when both voucher and company details are loaded */}
          {voucherDetail && !loading && !companyLoading && companyDetails && (
            <div className="p-6 space-y-6">
              {/* Voucher Header - Beautiful Invoice Style */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      TAX INVOICE #{voucherDetail.number}
                    </h2>
                    <div className="space-y-1">
                      <div className="flex items-center text-gray-600">
                        <Calendar className="mr-2" size={16} />
                        <span className="font-medium">Date:</span>
                        <span className="ml-2">{voucherDetail.date}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <User className="mr-2" size={16} />
                        <span className="font-medium">Customer:</span>
                        <span className="ml-2 font-semibold text-gray-900">{voucherDetail.party}</span>
                      </div>
                      {voucherDetail.reference && (
                        <div className="flex items-center text-gray-600">
                          <FileText className="mr-2" size={16} />
                          <span className="font-medium">Reference:</span>
                          <span className="ml-2">{voucherDetail.reference}</span>
                        </div>
                      )}
                      {voucherDetail.narration && (
                        <div className="flex items-start text-gray-600">
                          <Receipt className="mr-2 mt-0.5" size={16} />
                          <span className="font-medium">Note:</span>
                          <span className="ml-2 italic">{voucherDetail.narration}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm">
                      <div className="text-sm text-gray-600 mb-1">TOTAL AMOUNT</div>
                      <div className="text-3xl font-bold text-blue-600">
                        ₹{voucherDetail.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                      {voucherDetail.savings && voucherDetail.savings > 0 && (
                        <div className="text-sm text-green-600 mt-1">
                          You saved ₹{voucherDetail.savings.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm text-green-700 font-semibold mb-2">Subtotal</div>
                  <div className="text-2xl font-bold text-green-800">₹{voucherDetail.subTotal.toFixed(2)}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm text-blue-700 font-semibold mb-2">Total GST</div>
                  <div className="text-2xl font-bold text-blue-800">₹{voucherDetail.gstDetails.total.toFixed(2)}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm text-purple-700 font-semibold mb-2">Discount</div>
                  <div className="text-2xl font-bold text-purple-800">
                    {voucherDetail.totalDiscount && voucherDetail.totalDiscount > 0 
                      ? `₹${voucherDetail.totalDiscount.toFixed(2)}` 
                      : '₹0.00'
                    }
                  </div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-5 text-center shadow-sm hover:shadow-md transition-shadow">
                  <div className="text-sm text-amber-700 font-semibold mb-2">Round Off</div>
                  <div className={`text-2xl font-bold ${voucherDetail.roundOff > 0 ? 'text-green-800' : voucherDetail.roundOff < 0 ? 'text-red-800' : 'text-amber-800'}`}>
                    {voucherDetail.roundOff !== 0 
                      ? `${voucherDetail.roundOff > 0 ? '+' : ''}₹${voucherDetail.roundOff.toFixed(2)}`
                      : '₹0.00'
                    }
                  </div>
                </div>
              </div>

              {/* GST Breakdown */}
              <div className="bg-gradient-to-r from-orange-50 via-red-50 to-pink-50 border border-orange-200 rounded-xl p-6 shadow-sm">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center justify-center">
                    <Receipt className="mr-3 text-orange-600" size={24} />
                    GST Breakdown
                  </h3>
                </div>
                
                {/* GST Type Cards */}
                <div className="flex justify-center mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                    <div className="bg-white rounded-xl border-2 border-orange-200 p-6 text-center shadow-md hover:shadow-lg transition-shadow">
                      <div className="text-sm text-orange-700 font-semibold mb-3 uppercase tracking-wide">
                        CGST @ {voucherDetail.gstDetails.cgstRate || 9}%
                      </div>
                      <div className="text-3xl font-bold text-orange-800 mb-2">
                        ₹{voucherDetail.gstDetails.cgst.toFixed(2)}
                      </div>
                      <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                        Central GST
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border-2 border-red-200 p-6 text-center shadow-md hover:shadow-lg transition-shadow">
                      <div className="text-sm text-red-700 font-semibold mb-3 uppercase tracking-wide">
                        SGST @ {voucherDetail.gstDetails.sgstRate || 9}%
                      </div>
                      <div className="text-3xl font-bold text-red-800 mb-2">
                        ₹{voucherDetail.gstDetails.sgst.toFixed(2)}
                      </div>
                      <div className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                        State GST
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* IGST Card (if applicable) */}
                {voucherDetail.gstDetails.igst > 0 && (
                  <div className="flex justify-center mb-6">
                    <div className="max-w-sm w-full">
                      <div className="bg-white rounded-xl border-2 border-purple-200 p-6 text-center shadow-md hover:shadow-lg transition-shadow">
                        <div className="text-sm text-purple-700 font-semibold mb-3 uppercase tracking-wide">
                          IGST @ {voucherDetail.gstDetails.igstRate}%
                        </div>
                        <div className="text-3xl font-bold text-purple-800 mb-2">
                          ₹{voucherDetail.gstDetails.igst.toFixed(2)}
                        </div>
                        <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                          Integrated GST
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Total GST Amount */}
                <div className="bg-gradient-to-r from-orange-100 to-red-100 border border-orange-300 rounded-xl p-6 text-center">
                  <div className="text-sm text-gray-700 font-semibold mb-2 uppercase tracking-wide">Total GST Amount</div>
                  <div className="text-4xl font-bold text-orange-700 mb-2">
                    ₹{voucherDetail.gstDetails.total.toFixed(2)}
                  </div>
                  <div className="text-sm text-orange-600">
                    ({((voucherDetail.gstDetails.total / voucherDetail.taxableAmount) * 100).toFixed(1)}% of taxable amount)
                  </div>
                </div>
              </div>

              {/* Items Table - Beautiful Design */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <ShoppingCart className="mr-3" size={24} />
                    Invoice Items ({voucherDetail.items.length} items)
                  </h3>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center">
                            <Package className="mr-2" size={16} />
                            Item Details
                          </div>
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">HSN</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center justify-center">
                            <DollarSign className="mr-1" size={16} />
                            Rate
                          </div>
                        </th>
                        {voucherDetail.items.some(item => item.discount && item.discount > 0) && (
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex items-center justify-center">
                              <Percent className="mr-1" size={16} />
                              Discount
                            </div>
                          </th>
                        )}
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {voucherDetail.items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{item.stockItem}</div>
                          </td>
                          <td className="px-6 py-4 text-center text-sm text-gray-600">{item.hsn}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-medium">{item.quantity.toFixed(2)}</span>
                            <span className="text-xs text-gray-500 ml-1">{item.unit}</span>
                          </td>
                          <td className="px-6 py-4 text-center font-medium">₹{item.rate.toFixed(2)}</td>
                          {voucherDetail.items.some(item => item.discount && item.discount > 0) && (
                            <td className="px-6 py-4 text-center">
                              {item.discount && item.discount > 0 ? (
                                <div>
                                  <div className="text-red-600 font-medium">₹{item.discount.toFixed(2)}</div>
                                  {item.discountPercent && item.discountPercent > 0 && (
                                    <div className="text-xs text-red-500">({item.discountPercent.toFixed(1)}%)</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4 text-right">
                            <span className="text-lg font-bold text-gray-900">₹{item.amount.toFixed(2)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Comprehensive Financial Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Financial Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Subtotal (Before Tax):</span>
                    <span className="font-medium text-lg">₹{voucherDetail.subTotal.toFixed(2)}</span>
                  </div>
                  
                  {voucherDetail.totalDiscount && voucherDetail.totalDiscount > 0 && (
                    <div className="flex justify-between items-center py-2 text-red-600">
                      <span>Total Discount:</span>
                      <span className="font-medium text-lg">-₹{voucherDetail.totalDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Taxable Amount:</span>
                    <span className="font-medium text-lg">₹{voucherDetail.taxableAmount.toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t border-gray-300 pt-3">
                    {voucherDetail.gstDetails.cgst > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-600">CGST @ {voucherDetail.gstDetails.cgstRate}%:</span>
                        <span className="font-medium">₹{voucherDetail.gstDetails.cgst.toFixed(2)}</span>
                      </div>
                    )}
                    {voucherDetail.gstDetails.sgst > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-600">SGST @ {voucherDetail.gstDetails.sgstRate}%:</span>
                        <span className="font-medium">₹{voucherDetail.gstDetails.sgst.toFixed(2)}</span>
                      </div>
                    )}
                    {voucherDetail.gstDetails.igst > 0 && (
                      <div className="flex justify-between items-center py-1">
                        <span className="text-gray-600">IGST @ {voucherDetail.gstDetails.igstRate}%:</span>
                        <span className="font-medium">₹{voucherDetail.gstDetails.igst.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center py-2 font-medium">
                    <span className="text-gray-700">Total GST:</span>
                    <span className="text-lg">₹{voucherDetail.gstDetails.total.toFixed(2)}</span>
                  </div>
                  
                  {voucherDetail.roundOff !== 0 && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">Round Off:</span>
                      <span className={`font-medium ${voucherDetail.roundOff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {voucherDetail.roundOff > 0 ? '+' : ''}₹{voucherDetail.roundOff.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  <div className="border-t-2 border-blue-300 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-900">Grand Total:</span>
                      <span className="text-2xl font-bold text-blue-600">
                        ₹{voucherDetail.finalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  
                  {voucherDetail.savings && voucherDetail.savings > 0 && (
                    <div className="bg-green-100 border border-green-300 rounded-lg p-3 mt-3">
                      <div className="text-center text-green-800">
                        <div className="text-sm font-medium">Total Savings</div>
                        <div className="text-lg font-bold">₹{voucherDetail.savings.toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Only show export/share buttons when company details are loaded */}
            {companyDetails && !companyLoading && voucherDetail ? (
              <>
                {/* Export PDF Button */}
                <button
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  {exporting ? 'Generating...' : 'Export PDF'}
                </button>

                {/* Export Excel Button */}
                <button
                  onClick={handleExportExcel}
                  disabled={excelLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {excelLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  {excelLoading ? 'Generating...' : 'Export Excel'}
                </button>

                {/* Share Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowShareDropdown(!showShareDropdown)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showShareDropdown && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                      <button
                        onClick={handleShareWhatsApp}
                        className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-green-50 text-green-700 border-b border-gray-100"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </button>
                      <button
                        onClick={handleShareEmail}
                        className="flex items-center gap-2 w-full px-4 py-2 text-left hover:bg-blue-50 text-blue-700"
                      >
                        <Mail className="w-4 h-4" />
                        Email
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">
                {(loading || companyLoading) ? 'Loading...' : 'Export options will appear once data is loaded'}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Show when voucher is loaded but company details are missing */}
        {voucherDetail && !loading && !companyLoading && !companyDetails && (
          <div className="p-8">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <div className="text-amber-700 text-lg font-medium mb-2">Company Details Required</div>
              <p className="text-amber-600 mb-4">
                Voucher details loaded successfully, but company information is needed for PDF generation.
              </p>
              <button
                onClick={() => {
                  if (selectedCompany) {
                    const api = new CompanyApiService();
                    setCompanyDetails(null);
                    setCompanyLoading(true);
                    setCompanyLoadAttempted(true);
                    api.getCompanyDetails(selectedCompany).then(details => {
                      if (!details) {
                        setCompanyDetails(null);
                        setCompanyLoading(false);
                        return;
                      }
                      const toCamel = (str: string) => str.toLowerCase().replace(/[-_\.]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^([a-z])/, (m) => m.toLowerCase());
                      const normalizeKeys = (obj: any): any => {
                        if (!obj || typeof obj !== 'object') return obj;
                        if (Array.isArray(obj)) return obj.map((v: any) => normalizeKeys(v));
                        return Object.fromEntries(Object.entries(obj).map(([k, v]) => [toCamel(k), normalizeKeys(v)]));
                      };
                      const normalizedDetails = normalizeKeys(details);
                      setCompanyDetails(normalizedDetails);
                      setCompanyLoading(false);
                    }).catch(error => {
                      console.error('Error loading company details:', error);
                      setCompanyDetails(null);
                      setCompanyLoading(false);
                    });
                  }
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Load Company Details
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
