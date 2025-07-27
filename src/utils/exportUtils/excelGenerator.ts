import * as XLSX from 'xlsx';
import { TallyCompanyDetails } from '../../services/api/company/companyApiService';

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
  subTotal: number;
  netAmount: number;
  savings?: number;
}

interface ExcelGenerationOptions {
  voucher: VoucherDetail;
  companyDetails?: TallyCompanyDetails;
  partyDetails?: any;
  fileName?: string;
  includeCompanyDetails?: boolean;
}

export class ExcelGenerator {
  
  /**
   * Generates an Excel file for the invoice
   */
  public static async generateInvoiceExcel(options: ExcelGenerationOptions): Promise<Blob> {
    const { voucher, companyDetails, partyDetails, fileName, includeCompanyDetails = true } = options;
    
    const workbook = XLSX.utils.book_new();
    
    // Create main invoice sheet
    const invoiceData = this.createInvoiceSheetData(voucher, companyDetails, partyDetails, includeCompanyDetails);
    const invoiceSheet = XLSX.utils.aoa_to_sheet(invoiceData);
    
    // Apply styling and formatting
    this.formatInvoiceSheet(invoiceSheet, invoiceData.length);
    
    XLSX.utils.book_append_sheet(workbook, invoiceSheet, 'Invoice');
    
    // Create items detail sheet
    const itemsData = this.createItemsSheetData(voucher);
    const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
    this.formatItemsSheet(itemsSheet);
    
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Items Detail');
    
    // Create summary sheet
    const summaryData = this.createSummarySheetData(voucher, companyDetails);
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    this.formatSummarySheet(summarySheet);
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Generate blob
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Trigger download if filename provided
    if (fileName) {
      this.downloadExcel(blob, fileName);
    }
    
    return blob;
  }

  private static createInvoiceSheetData(
    voucher: VoucherDetail, 
    companyDetails?: TallyCompanyDetails, 
    partyDetails?: any,
    includeCompanyDetails: boolean = true
  ): any[][] {
    const data: any[][] = [];
    
    // Title
    data.push(['TAX INVOICE', '', '', '', '', '', '', '']);
    data.push(['']); // Empty row
    
    // Company details (if available and requested)
    if (includeCompanyDetails && companyDetails) {
      data.push(['COMPANY DETAILS', '', '', '', 'INVOICE DETAILS', '', '', '']);
      data.push(['Company Name:', this.getCompanyName(companyDetails), '', '', 'Invoice No:', voucher.number, '', '']);
      
      const address = this.getCompanyAddress(companyDetails);
      if (address.length > 0) {
        data.push(['Address:', address[0] || '', '', '', 'Date:', this.formatDate(voucher.date), '', '']);
        for (let i = 1; i < address.length; i++) {
          data.push(['', address[i] || '', '', '', '', '', '', '']);
        }
      } else {
        data.push(['Address:', 'Not provided', '', '', 'Date:', this.formatDate(voucher.date), '', '']);
      }
      
      const gstin = companyDetails.gstregistrationnumber || companyDetails.gstin || 'Not provided';
      data.push(['GSTIN:', gstin, '', '', 'Reference:', voucher.reference || 'N/A', '', '']);
      
      const state = companyDetails.priorstatename || companyDetails.stateName || 'Not provided';
      data.push(['State:', state, '', '', 'Voucher Type:', voucher.voucherType, '', '']);
      
      data.push(['']); // Empty row
    } else {
      // Simple invoice details without company info
      data.push(['Invoice No:', voucher.number, '', '', '', '', '', '']);
      data.push(['Date:', this.formatDate(voucher.date), '', '', '', '', '', '']);
      data.push(['Reference:', voucher.reference || 'N/A', '', '', '', '', '', '']);
      data.push(['Voucher Type:', voucher.voucherType, '', '', '', '', '', '']);
      data.push(['']); // Empty row
    }
    
    // Customer details
    data.push(['CUSTOMER DETAILS', '', '', '', '', '', '', '']);
    data.push(['Customer Name:', voucher.party, '', '', '', '', '', '']);
    if (partyDetails?.address) {
      data.push(['Address:', partyDetails.address, '', '', '', '', '', '']);
    }
    if (voucher.partyGstin) {
      data.push(['GSTIN:', voucher.partyGstin, '', '', '', '', '', '']);
    }
    if (voucher.placeOfSupply) {
      data.push(['Place of Supply:', voucher.placeOfSupply, '', '', '', '', '', '']);
    }
    data.push(['']); // Empty row
    
    // Items header
    data.push(['ITEMS', '', '', '', '', '', '', '']);
    data.push([
      'Sl No.',
      'Description',
      'HSN/SAC',
      'Quantity',
      'Unit',
      'Rate',
      'Discount %',
      'Amount'
    ]);
    
    // Items data
    voucher.items.forEach((item, index) => {
      data.push([
        index + 1,
        item.stockItem,
        item.hsn,
        item.quantity,
        item.unit,
        item.rate,
        item.discountPercent || 0,
        item.amount
      ]);
    });
    
    data.push(['']); // Empty row
    
    // Summary
    data.push(['SUMMARY', '', '', '', '', '', '', '']);
    data.push(['Subtotal:', '', '', '', '', '', '', voucher.subTotal]);
    
    if (voucher.totalDiscount && voucher.totalDiscount > 0) {
      data.push(['Total Discount:', '', '', '', '', '', '', `-${voucher.totalDiscount}`]);
    }
    
    if (voucher.gstDetails.cgst > 0) {
      data.push([`CGST @ ${voucher.gstDetails.cgstRate}%:`, '', '', '', '', '', '', voucher.gstDetails.cgst]);
    }
    
    if (voucher.gstDetails.sgst > 0) {
      data.push([`SGST @ ${voucher.gstDetails.sgstRate}%:`, '', '', '', '', '', '', voucher.gstDetails.sgst]);
    }
    
    if (voucher.gstDetails.igst > 0) {
      data.push([`IGST @ ${voucher.gstDetails.igstRate}%:`, '', '', '', '', '', '', voucher.gstDetails.igst]);
    }
    
    data.push(['Total Tax:', '', '', '', '', '', '', voucher.totalTax]);
    
    if (voucher.roundOff !== 0) {
      data.push(['Round Off:', '', '', '', '', '', '', voucher.roundOff]);
    }
    
    data.push(['TOTAL AMOUNT:', '', '', '', '', '', '', voucher.finalAmount]);
    
    return data;
  }

  private static createItemsSheetData(voucher: VoucherDetail): any[][] {
    const data: any[][] = [];
    
    data.push(['ITEMS DETAIL REPORT']);
    data.push(['Invoice No:', voucher.number]);
    data.push(['Date:', this.formatDate(voucher.date)]);
    data.push(['Customer:', voucher.party]);
    data.push(['']); // Empty row
    
    data.push([
      'Sl No.',
      'Item Name',
      'HSN/SAC Code',
      'Quantity',
      'Unit',
      'Rate (₹)',
      'Discount (%)',
      'Discount Amount (₹)',
      'Taxable Amount (₹)',
      'CGST Rate (%)',
      'CGST Amount (₹)',
      'SGST Rate (%)',
      'SGST Amount (₹)',
      'IGST Rate (%)',
      'IGST Amount (₹)',
      'Total Amount (₹)'
    ]);
    
    voucher.items.forEach((item, index) => {
      const discountAmount = item.discount || 0;
      const taxableAmount = item.amount - discountAmount;
      
      // Calculate individual item GST (approximate based on item amount proportion)
      const itemProportion = item.amount / voucher.subTotal;
      const itemCGST = voucher.gstDetails.cgst * itemProportion;
      const itemSGST = voucher.gstDetails.sgst * itemProportion;
      const itemIGST = voucher.gstDetails.igst * itemProportion;
      
      data.push([
        index + 1,
        item.stockItem,
        item.hsn,
        item.quantity,
        item.unit,
        item.rate,
        item.discountPercent || 0,
        discountAmount,
        taxableAmount,
        voucher.gstDetails.cgstRate,
        itemCGST,
        voucher.gstDetails.sgstRate,
        itemSGST,
        voucher.gstDetails.igstRate,
        itemIGST,
        item.amount + itemCGST + itemSGST + itemIGST
      ]);
    });
    
    return data;
  }

  private static createSummarySheetData(voucher: VoucherDetail, companyDetails?: TallyCompanyDetails): any[][] {
    const data: any[][] = [];
    
    data.push(['INVOICE SUMMARY REPORT']);
    data.push(['']); // Empty row
    
    // Basic info
    data.push(['Invoice Information', '']);
    data.push(['Invoice Number', voucher.number]);
    data.push(['Date', this.formatDate(voucher.date)]);
    data.push(['Customer', voucher.party]);
    data.push(['Voucher Type', voucher.voucherType]);
    data.push(['Reference', voucher.reference || 'N/A']);
    data.push(['']); // Empty row
    
    // Financial summary
    data.push(['Financial Summary', '']);
    data.push(['Number of Items', voucher.items.length]);
    data.push(['Total Quantity', voucher.items.reduce((sum, item) => sum + item.quantity, 0)]);
    data.push(['Subtotal (Before Tax)', voucher.subTotal]);
    data.push(['Total Discount', voucher.totalDiscount || 0]);
    data.push(['Taxable Amount', voucher.taxableAmount]);
    data.push(['']); // Empty row
    
    // Tax breakdown
    data.push(['Tax Breakdown', '']);
    data.push(['CGST Rate (%)', voucher.gstDetails.cgstRate]);
    data.push(['CGST Amount (₹)', voucher.gstDetails.cgst]);
    data.push(['SGST Rate (%)', voucher.gstDetails.sgstRate]);
    data.push(['SGST Amount (₹)', voucher.gstDetails.sgst]);
    data.push(['IGST Rate (%)', voucher.gstDetails.igstRate]);
    data.push(['IGST Amount (₹)', voucher.gstDetails.igst]);
    data.push(['Total Tax', voucher.totalTax]);
    data.push(['']); // Empty row
    
    // Final amounts
    data.push(['Final Calculation', '']);
    data.push(['Round Off', voucher.roundOff]);
    data.push(['Final Amount', voucher.finalAmount]);
    data.push(['']); // Empty row
    
    // Company info (if available)
    if (companyDetails) {
      data.push(['Company Information', '']);
      data.push(['Company Name', this.getCompanyName(companyDetails)]);
      data.push(['GSTIN', companyDetails.gstregistrationnumber || companyDetails.gstin || 'N/A']);
      data.push(['State', companyDetails.priorstatename || companyDetails.stateName || 'N/A']);
      data.push(['PAN', companyDetails.incometaxnumber || companyDetails.pan || 'N/A']);
    }
    
    return data;
  }

  private static formatInvoiceSheet(sheet: XLSX.WorkSheet, rowCount: number): void {
    // Set column widths
    sheet['!cols'] = [
      { width: 15 }, // A
      { width: 25 }, // B
      { width: 15 }, // C
      { width: 15 }, // D
      { width: 15 }, // E
      { width: 15 }, // F
      { width: 12 }, // G
      { width: 15 }  // H
    ];
    
    // Set row heights for better readability
    sheet['!rows'] = Array(rowCount).fill({ hpt: 20 });
  }

  private static formatItemsSheet(sheet: XLSX.WorkSheet): void {
    // Set column widths for items detail
    sheet['!cols'] = [
      { width: 8 },  // Sl No
      { width: 30 }, // Item Name
      { width: 12 }, // HSN
      { width: 10 }, // Quantity
      { width: 8 },  // Unit
      { width: 12 }, // Rate
      { width: 10 }, // Discount %
      { width: 15 }, // Discount Amount
      { width: 15 }, // Taxable Amount
      { width: 12 }, // CGST Rate
      { width: 15 }, // CGST Amount
      { width: 12 }, // SGST Rate
      { width: 15 }, // SGST Amount
      { width: 12 }, // IGST Rate
      { width: 15 }, // IGST Amount
      { width: 15 }  // Total Amount
    ];
  }

  private static formatSummarySheet(sheet: XLSX.WorkSheet): void {
    // Set column widths for summary
    sheet['!cols'] = [
      { width: 25 }, // Labels
      { width: 20 }  // Values
    ];
  }

  private static getCompanyName(companyDetails: TallyCompanyDetails): string {
    return companyDetails.name || 
           companyDetails.basiccompanyformalname || 
           companyDetails.cmptradename || 
           'Company Name Not Available';
  }

  private static getCompanyAddress(companyDetails: TallyCompanyDetails): string[] {
    if (companyDetails.addresslist && Array.isArray(companyDetails.addresslist)) {
      return companyDetails.addresslist;
    } else if (companyDetails.address && Array.isArray(companyDetails.address)) {
      return companyDetails.address;
    } else if (typeof companyDetails.addresslist === 'string') {
      return [companyDetails.addresslist];
    }
    return [];
  }

  private static formatDate(dateString: string): string {
    try {
      // Handle different date formats (YYYYMMDD, DD/MM/YYYY, etc.)
      if (dateString.length === 8 && /^\d{8}$/.test(dateString)) {
        const year = dateString.substring(0, 4);
        const month = dateString.substring(4, 6);
        const day = dateString.substring(6, 8);
        return `${day}/${month}/${year}`;
      }
      return dateString;
    } catch {
      return dateString;
    }
  }

  private static downloadExcel(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
