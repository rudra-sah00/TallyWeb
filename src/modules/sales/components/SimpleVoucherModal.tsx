import React, { useState, useEffect } from 'react';
import { X, FileText, User, Calendar, Receipt, ShoppingCart, DollarSign, Percent, Package, Share2 } from 'lucide-react';
import { SalesApiService } from '../../../services/api/sales/salesApiService';
import { useCompany } from '../../../context/CompanyContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import CompanyApiService, { TallyCompanyDetails } from '../../../services/api/company/companyApiService';
import LedgerApiService from '../../../services/api/ledger/ledgerApiService';

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
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState<TallyCompanyDetails | null>(null);
  const [partyDetails, setPartyDetails] = useState<any>(null); // You can type this better if needed

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
    if (isOpen && selectedCompany) {
      // Fetch company details
      const api = new CompanyApiService();
      api.getCompanyDetails(selectedCompany).then(details => {
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
        setCompanyDetails(normalizeKeys(details));
        console.log('DEBUG companyDetails:', normalizeKeys(details)); // Debug log
      });
    }
  }, [isOpen, selectedCompany]);

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
  const handleShareClick = () => {
    setShowShareOptions(true);
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!voucherDetail) return;
    setExporting(true);
    setShowShareOptions(false);
    try {
      if (format === 'pdf') {
        const doc = new jsPDF('p', 'mm', 'a4');
        // --- PDF generation code ---
        // Header Bar
        doc.setFillColor(41, 128, 185);
        doc.rect(0, 0, 210, 14, 'F');
        doc.setFontSize(14);
        doc.setTextColor(255);
        doc.text('Tax Invoice', 105, 9, { align: 'center' });
        doc.setTextColor(0);
        // Company Info
        let y = 20;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(companyDetails?.name || companyDetails?.basiccompanyformalname || companyDetails?.cmptradename || '', 10, y);
        doc.setFont('helvetica', 'normal');
        y += 6;
        if (companyDetails?.addresslist && Array.isArray(companyDetails.addresslist) && companyDetails.addresslist.length > 0) {
          companyDetails.addresslist.forEach((line: string) => {
            doc.text(line, 10, y);
            y += 5;
          });
        } else if (typeof companyDetails?.addresslist === 'string' && companyDetails.addresslist) {
          doc.text(companyDetails.addresslist, 10, y);
          y += 5;
        }
        if (companyDetails?.mobilenumberslist && Array.isArray(companyDetails.mobilenumberslist) && companyDetails.mobilenumberslist.length > 0) {
          doc.text(`Mob: ${companyDetails.mobilenumberslist.join(', ')}`, 10, y);
          y += 5;
        } else if (companyDetails?.phone) {
          doc.text(`Mob: ${companyDetails.phone}`, 10, y);
          y += 5;
        }
        if (companyDetails?.gstregistrationnumber) {
          doc.text(`GSTIN/UIN: ${companyDetails.gstregistrationnumber}`, 10, y);
          y += 5;
        }
        if (companyDetails?.priorstatename) {
          doc.text(`State Name: ${companyDetails.priorstatename}`, 10, y);
          y += 5;
        }
        if (companyDetails?.email) {
          doc.text(`E-Mail: ${companyDetails.email}`, 10, y);
          y += 5;
        }
        // Invoice Info
        let xRight = 120;
        let yRight = 20;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Invoice No.:', xRight, yRight);
        doc.setFont('helvetica', 'normal');
        doc.text(voucherDetail.number, xRight + 35, yRight);
        yRight += 8;
        doc.setFont('helvetica', 'bold');
        doc.text('Dated:', xRight, yRight);
        doc.setFont('helvetica', 'normal');
        doc.text(voucherDetail.date, xRight + 35, yRight);
        // Buyer Info
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Buyer (Bill to)', 10, y);
        doc.setFont('helvetica', 'normal');
        y += 6;
        doc.text(voucherDetail.party, 10, y);
        y += 5;
        if (partyDetails?.address) {
          doc.text(partyDetails.address, 10, y);
          y += 5;
        }
        if (partyDetails?.stateName) {
          doc.text(`State Name: ${partyDetails.stateName}, Code: 21`, 10, y);
          y += 5;
        }
        // Table
        const tableStartY = Math.max(y + 4, 60);
        autoTable(doc, {
          startY: tableStartY,
          head: [[
            'Sl No.', 'Description of Goods', 'HSN/SAC', 'Quantity', 'Rate', 'per', 'Disc. %', 'Amount'
          ]],
          body: voucherDetail.items.map((item, idx) => [
            idx + 1,
            item.stockItem,
            item.hsn,
            `${item.quantity} ${item.unit}`,
            item.rate,
            item.unit,
            item.discountPercent || '',
            item.amount.toFixed(2)
          ]),
          theme: 'grid',
          headStyles: { fillColor: [220, 230, 241], textColor: 0, fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 2 },
          alternateRowStyles: { fillColor: [245, 248, 255] },
          columnStyles: {
            0: { cellWidth: 12 },
            1: { cellWidth: 60 },
            2: { cellWidth: 20 },
            3: { cellWidth: 22 },
            4: { cellWidth: 18 },
            5: { cellWidth: 14 },
            6: { cellWidth: 16 },
            7: { cellWidth: 24 }
          }
        });
        // GST & Summary
        let summaryY = (doc as any).lastAutoTable.finalY + 8;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text('Output CGST @9%', 120, summaryY);
        doc.text('Output SGST @9%', 120, summaryY + 6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text('9 %', 160, summaryY);
        doc.text('9 %', 160, summaryY + 6);
        doc.text(voucherDetail.gstDetails.cgst.toFixed(2), 180, summaryY);
        doc.text(voucherDetail.gstDetails.sgst.toFixed(2), 180, summaryY + 6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(41, 128, 185);
        doc.text('Rounding Off', 120, summaryY + 12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0);
        doc.text(voucherDetail.roundOff.toFixed(2), 180, summaryY + 12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(33, 150, 83);
        doc.text('Total', 120, summaryY + 18);
        doc.text(`Rs ${voucherDetail.finalAmount.toFixed(2)}`, 180, summaryY + 18);
        // Amount in Words
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text('Amount Chargeable (in words)', 10, summaryY + 18);
        doc.setFont('helvetica', 'bold');
        doc.text('INR Seven Thousand Six Hundred Only', 10, summaryY + 24);
        // Address Block
        let addressY = (doc as any).lastAutoTable?.finalY + 20 || 120;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Company Address:', 10, addressY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        if (companyDetails?.addresslist && Array.isArray(companyDetails.addresslist) && companyDetails.addresslist.length > 0) {
          companyDetails.addresslist.forEach((line: string, idx: number) => {
            doc.text(line, 10, addressY + 5 + idx * 5);
          });
          addressY += 5 * companyDetails.addresslist.length;
        } else if (typeof companyDetails?.addresslist === 'string' && companyDetails.addresslist) {
          doc.text(companyDetails.addresslist, 10, addressY + 5);
          addressY += 5;
        } else {
          doc.text('Not Provided', 10, addressY + 5);
          addressY += 5;
        }
        addressY += 8;
        // Footer: Company Details, PAN, GSTIN, Bank Details
        let footerY = addressY;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("Company's PAN:", 10, footerY);
        doc.setFont('helvetica', 'normal');
        doc.text(companyDetails?.incometaxnumber || 'Not Provided', 40, footerY);
        doc.setFont('helvetica', 'bold');
        doc.text("GSTIN:", 80, footerY);
        doc.setFont('helvetica', 'normal');
        doc.text(companyDetails?.gstregistrationnumber || 'Not Provided', 100, footerY);
        doc.setFont('helvetica', 'bold');
        doc.text('Contact:', 140, footerY);
        doc.setFont('helvetica', 'normal');
        doc.text((companyDetails?.companycontactperson ? companyDetails.companycontactperson + ' ' : '') + (companyDetails?.companycontactnumber || 'Not Provided'), 160, footerY);
        footerY += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Bank Details:', 10, footerY);
        doc.setFont('helvetica', 'normal');
        if (companyDetails?.banknames && Array.isArray(companyDetails.banknames) && companyDetails.banknames.length > 0) {
          companyDetails.banknames.forEach((bank: string, idx: number) => {
            doc.text(bank, 30, footerY + idx * 5);
          });
          footerY += companyDetails.banknames.length * 5;
        } else if (typeof companyDetails?.banknames === 'string' && companyDetails.banknames) {
          doc.text(companyDetails.banknames, 30, footerY);
          footerY += 5;
        } else if (companyDetails?.companychequename) {
          doc.text(companyDetails.companychequename, 30, footerY);
          footerY += 5;
        } else {
          doc.text('Not Provided', 30, footerY);
          footerY += 5;
        }
        // Declaration
        footerY += 2;
        doc.setFont('helvetica', 'bold');
        doc.text('Declaration', 10, footerY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('1. Goods once sold will not be returned. 2. All disputes are subject to KAMAKSHYANAGAR jurisdiction. 3. Payment within 7 days otherwise 18% interest will be charged per annum from the date of invoice.', 10, footerY + 5, { maxWidth: 120 });
        // Signature
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`for ${companyDetails?.name || ''}`, 150, footerY + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text('Authorised Signatory', 170, footerY + 15);
        // Save/Share
        const pdfBlob = doc.output('blob');
        const url = URL.createObjectURL(pdfBlob);
        setShareUrl(url);
        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${voucherDetail.number}.pdf`;
        a.click();
      } else if (format === 'excel') {
        const wsData = [
          ['Tax Invoice', voucherDetail.number],
          ['Date', voucherDetail.date],
          ['Customer', voucherDetail.party],
          ['Amount', voucherDetail.finalAmount],
          [],
          ['Item', 'HSN', 'Qty', 'Unit', 'Rate', 'Amount', 'Discount'],
          ...voucherDetail.items.map(item => [
            item.stockItem,
            item.hsn,
            item.quantity,
            item.unit,
            item.rate,
            item.amount,
            item.discount || 0
          ]),
          [],
          ['Total GST', voucherDetail.gstDetails.total],
          ['Grand Total', voucherDetail.finalAmount]
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        setShareUrl(url);
        // Trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${voucherDetail.number}.xlsx`;
        a.click();
      }
    } catch (err) {
      setError('Failed to export file');
    } finally {
      setExporting(false);
    }
  };

  const handleShareViaWhatsApp = () => {
    if (!shareUrl) return;
    const text = encodeURIComponent(`Invoice for ${voucherDetail?.party} (No. ${voucherDetail?.number})`);
    window.open(`https://wa.me/?text=${text}%0A${shareUrl}`, '_blank');
  };

  const handleShareViaEmail = () => {
    if (!shareUrl) return;
    const subject = encodeURIComponent(`Invoice #${voucherDetail?.number}`);
    const body = encodeURIComponent(`Please find attached the invoice. Download: ${shareUrl}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div>
            <h2 className="text-xl font-semibold">Tax Invoice Details</h2>
            <p className="text-blue-100">Voucher: {voucherNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleShareClick}
              className="text-white hover:text-gray-200 transition-colors flex items-center px-3 py-1 rounded-lg border border-white/20 bg-blue-700 hover:bg-blue-800"
              title="Share or Export"
              disabled={loading || exporting}
            >
              <Share2 className="mr-2" size={20} /> Share
            </button>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors ml-2"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Share Options Modal */}
        {showShareOptions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-xs w-full text-center">
              <h3 className="text-lg font-semibold mb-4">Export Invoice As</h3>
              <div className="flex flex-col gap-4">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={() => handleExport('pdf')}
                  disabled={exporting}
                >
                  PDF
                </button>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  onClick={() => handleExport('excel')}
                  disabled={exporting}
                >
                  Excel
                </button>
                <button
                  className="mt-2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowShareOptions(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Share Actions after export & Live PDF Preview */}
        {shareUrl && (
          <>
            <div className="fixed top-24 right-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 flex flex-col gap-2">
              <span className="font-medium text-gray-700 mb-2">Share this file:</span>
              <button
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                onClick={handleShareViaWhatsApp}
              >
                WhatsApp
              </button>
              <button
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={handleShareViaEmail}
              >
                Email
              </button>
              <a
                href={shareUrl}
                download
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 text-center"
              >
                Download
              </a>
              <button
                className="mt-1 text-xs text-gray-400 hover:text-gray-600"
                onClick={() => setShareUrl(null)}
              >
                Close
              </button>
            </div>
            {/* Live PDF Preview Section */}
            <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-[min(90vw,700px)] max-h-[70vh] flex flex-col items-center">
              <span className="font-medium text-gray-700 mb-2">Live PDF Preview</span>
              <iframe
                src={shareUrl}
                title="PDF Preview"
                className="w-full h-[60vh] border rounded-lg shadow"
                style={{ background: '#f8fafc' }}
              />
              <span className="text-xs text-gray-400 mt-2">(Scroll to view full PDF. If blank, try exporting again.)</span>
            </div>
          </>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading && (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <span className="text-lg text-gray-600">Loading voucher details...</span>
                <p className="text-sm text-gray-500 mt-2">Fetching comprehensive invoice information</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <div className="text-red-600 text-lg font-medium mb-2">Error Loading Voucher</div>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {voucherDetail && (
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <div className="text-sm text-green-700 font-medium">Subtotal</div>
                  <div className="text-xl font-bold text-green-800">₹{voucherDetail.subTotal.toFixed(2)}</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-sm text-blue-700 font-medium">Total GST</div>
                  <div className="text-xl font-bold text-blue-800">₹{voucherDetail.gstDetails.total.toFixed(2)}</div>
                </div>
                {voucherDetail.totalDiscount && voucherDetail.totalDiscount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div className="text-sm text-red-700 font-medium">Discount</div>
                    <div className="text-xl font-bold text-red-800">₹{voucherDetail.totalDiscount.toFixed(2)}</div>
                  </div>
                )}
                {voucherDetail.roundOff !== 0 && (
                  <div className={`${voucherDetail.roundOff > 0 ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} border rounded-lg p-4 text-center`}>
                    <div className={`text-sm font-medium ${voucherDetail.roundOff > 0 ? 'text-green-700' : 'text-orange-700'}`}>Round Off</div>
                    <div className={`text-xl font-bold ${voucherDetail.roundOff > 0 ? 'text-green-800' : 'text-orange-800'}`}>
                      {voucherDetail.roundOff > 0 ? '+' : ''}₹{voucherDetail.roundOff.toFixed(2)}
                    </div>
                  </div>
                )}
              </div>

              {/* GST Breakdown - Indian Style */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <Receipt className="mr-3" size={24} />
                  GST Breakdown (Indian Standard)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {voucherDetail.gstDetails.cgst > 0 && (
                    <div className="bg-white rounded-lg border border-orange-200 p-4 text-center shadow-sm">
                      <div className="text-sm text-orange-700 font-medium">CGST @ {voucherDetail.gstDetails.cgstRate}%</div>
                      <div className="text-2xl font-bold text-orange-800">₹{voucherDetail.gstDetails.cgst.toFixed(2)}</div>
                    </div>
                  )}
                  {voucherDetail.gstDetails.sgst > 0 && (
                    <div className="bg-white rounded-lg border border-orange-200 p-4 text-center shadow-sm">
                      <div className="text-sm text-orange-700 font-medium">SGST @ {voucherDetail.gstDetails.sgstRate}%</div>
                      <div className="text-2xl font-bold text-orange-800">₹{voucherDetail.gstDetails.sgst.toFixed(2)}</div>
                    </div>
                  )}
                  {voucherDetail.gstDetails.igst > 0 && (
                    <div className="bg-white rounded-lg border border-orange-200 p-4 text-center shadow-sm">
                      <div className="text-sm text-orange-700 font-medium">IGST @ {voucherDetail.gstDetails.igstRate}%</div>
                      <div className="text-2xl font-bold text-orange-800">₹{voucherDetail.gstDetails.igst.toFixed(2)}</div>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-center">
                  <div className="text-sm text-gray-600 mb-1">Total GST Amount</div>
                  <div className="text-3xl font-bold text-orange-600">
                    ₹{voucherDetail.gstDetails.total.toFixed(2)}
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
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
