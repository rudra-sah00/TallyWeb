import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

interface PDFGenerationOptions {
  voucher: VoucherDetail;
  companyDetails: TallyCompanyDetails;
  partyDetails?: any;
  customSettings?: {
    fontSize?: {
      header?: number;
      company?: number;
      items?: number;
      summary?: number;
      buyer?: number;
      footer?: number;
    };
    margins?: {
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
    };
    columnWidths?: {
      sl?: number;
      description?: number;
      hsn?: number;
      qty?: number;
      unit?: number;
      rate?: number;
      disc?: number;
      amount?: number;
    };
    spacing?: {
      lineHeight?: number;
      sectionGap?: number;
      tableRowHeight?: number;
      headerHeight?: number;
    };
    colors?: {
      header?: string;
      accent?: string;
      text?: string;
      tableBorder?: string;
      alternateRow?: string;
    };
    borders?: {
      showCompanyBorder?: boolean;
      showTableBorder?: boolean;
      showSectionBorders?: boolean;
      showInvoiceInfoBorder?: boolean;
      borderWidth?: number;
      borderStyle?: 'solid' | 'dashed' | 'dotted';
    };
    styling?: {
      roundedCorners?: boolean;
      showWatermark?: boolean;
      watermarkText?: string;
      showPageNumbers?: boolean;
      tableStyle?: 'grid' | 'striped' | 'plain';
      headerGradient?: boolean;
      showTotalInWords?: boolean;
      compactMode?: boolean;
    };
    branding?: {
      showLogo?: boolean;
      logoPosition?: 'left' | 'center' | 'right';
      companyNameStyle?: 'normal' | 'bold' | 'uppercase';
      showBankDetails?: boolean;
      showTermsConditions?: boolean;
      customFooterText?: string;
    };
  };
  fileName?: string;
}

export class PDFGenerator {
  private doc: jsPDF;
  private currentY: number = 20;
  private pageWidth: number = 210;
  private pageHeight: number = 297;
  private margin: number = 10;
  public customSettings: any = null;  
  private settings: any = {}; // Applied settings
  private readonly bottomMargin: number = 30; // Reserve space for footer/signature

  constructor() {
    this.doc = new jsPDF('p', 'mm', 'a4');
  }

  private applyCustomSettings(customSettings?: any) {
    // Default settings
    this.settings = {
      fontSize: {
        header: 16,
        company: 14,
        items: 8,
        summary: 10,
        buyer: 12,
        footer: 8
      },
      margins: {
        top: 20,
        bottom: 20,
        left: 10,
        right: 10
      },
      spacing: {
        lineHeight: 5,
        sectionGap: 8,
        tableRowHeight: 3,
        headerHeight: 10
      },
      colors: {
        header: '#2980b9',
        accent: '#3498db',
        text: '#000000',
        tableBorder: '#cccccc',
        alternateRow: '#f8f9fa'
      },
      borders: {
        showCompanyBorder: true,
        showTableBorder: true,
        showSectionBorders: false,
        showInvoiceInfoBorder: true,
        borderWidth: 1,
        borderStyle: 'solid'
      },
      styling: {
        roundedCorners: false,
        showWatermark: false,
        watermarkText: 'INVOICE',
        showPageNumbers: true,
        tableStyle: 'grid',
        headerGradient: false,
        showTotalInWords: true,
        compactMode: false
      },
      branding: {
        showLogo: false,
        logoPosition: 'left',
        companyNameStyle: 'bold',
        showBankDetails: true,
        showTermsConditions: true,
        customFooterText: ''
      }
    };

    // Apply custom settings or from the customSettings property
    const settingsToApply = customSettings || this.customSettings;
    if (settingsToApply) {
      this.settings = this.deepMerge(this.settings, settingsToApply);
    }

    // Update margins if provided
    if (this.settings.margins) {
      this.margin = this.settings.margins.left || 10;
    }
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  /**
   * Validates if company details are sufficient for PDF generation
   */
  public static validateCompanyDetails(companyDetails: TallyCompanyDetails | null): string[] {
    const errors: string[] = [];
    
    if (!companyDetails) {
      errors.push('Company details are required for PDF generation');
      return errors;
    }

    console.log('Validating company details:', companyDetails);

    // Check for mandatory fields - be more flexible with field names
    const companyName = companyDetails.name || 
                       companyDetails.basiccompanyformalname || 
                       companyDetails.cmptradename ||
                       companyDetails.basicCompanyFormalName ||
                       companyDetails.cmpTradeName;
    
    if (!companyName) {
      errors.push('Company name is required');
    }

    // Make GSTIN optional for now since the test company doesn't have it
    const gstin = companyDetails.gstregistrationnumber || 
                 companyDetails.gstin ||
                 companyDetails.gstRegistrationNumber;
    
    if (!gstin) {
      console.warn('Company GSTIN is missing - proceeding without it');
      // Don't add as error, just warn
    }

    const state = companyDetails.priorstatename || 
                 companyDetails.stateName ||
                 companyDetails.priorStateName;
    
    if (!state) {
      errors.push('Company state is required');
    }

    // Check address with multiple possible field names
    const address = this.getCompanyAddressForValidation(companyDetails);
    if (address.length === 0) {
      errors.push('Company address is required');
    }

    console.log(`Validation result: ${errors.length} errors found`, errors);
    return errors;
  }

  private static getCompanyAddressForValidation(companyDetails: TallyCompanyDetails): string[] {
    // Try multiple possible field names for address
    if (companyDetails.addresslist && Array.isArray(companyDetails.addresslist)) {
      return companyDetails.addresslist;
    } else if (companyDetails.address && Array.isArray(companyDetails.address)) {
      return companyDetails.address;
    } else if (companyDetails.addressList && Array.isArray(companyDetails.addressList)) {
      return companyDetails.addressList;
    } else if (typeof companyDetails.addresslist === 'string') {
      return [companyDetails.addresslist];
    } else if (typeof companyDetails.address === 'string') {
      return [companyDetails.address];
    }
    return [];
  }

  /**
   * Generates a professional PDF invoice
   */
  public async generateInvoicePDF(options: PDFGenerationOptions): Promise<Blob> {
    const { voucher, companyDetails, partyDetails, fileName, customSettings } = options;

    // Debug: Log company details being passed to PDF generator
    console.log('PDF Generator - Company Details received:', companyDetails);
    console.log('PDF Generator - Available fields:', Object.keys(companyDetails || {}));
    console.log('PDF Generator - GSTIN fields check:', {
      gstin: companyDetails?.gstin,
      loginidentifier: companyDetails?.loginidentifier,
      gstregistrationnumber: companyDetails?.gstregistrationnumber
    });

    // Validate company details
    const validationErrors = PDFGenerator.validateCompanyDetails(companyDetails);
    if (validationErrors.length > 0) {
      throw new Error(`Cannot generate PDF: ${validationErrors.join(', ')}`);
    }

    // Apply custom settings
    this.applyCustomSettings(customSettings);

    this.resetDocument();
    
    // Add watermark if enabled
    if (this.settings.styling.showWatermark) {
      this.addWatermark();
    }
    
    // Generate PDF content
    this.addHeader();
    this.addCompanySection(companyDetails);
    this.addInvoiceInfoSection(voucher);
    this.addBuyerSection(voucher, partyDetails);
    this.addItemsTable(voucher);
    this.addTaxSummary(voucher);
    
    this.addFooterSection();
    this.addDeclarationAndSignature(companyDetails);

    // Add page numbers if enabled
    if (this.settings.styling.showPageNumbers) {
      this.addPageNumbers();
    }

    // Generate blob
    const pdfBlob = this.doc.output('blob');
    
    // Trigger download if filename provided
    if (fileName) {
      this.downloadPDF(pdfBlob, fileName);
    }

    return pdfBlob;
  }

  private resetDocument(): void {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.currentY = 20;
  }

  /**
   * Check if there's enough space remaining on the current page
   */
  private hasSpaceForContent(requiredHeight: number): boolean {
    const availableSpace = this.pageHeight - this.currentY - this.bottomMargin;
    return availableSpace >= requiredHeight;
  }

  /**
   * Add a new page and reset Y position
   */
  private addNewPage(): void {
    this.doc.addPage();
    this.currentY = this.settings?.margins?.top || 20;
  }

  /**
   * Ensure there's enough space for content, add new page if needed
   */
  private ensureSpaceForContent(requiredHeight: number): void {
    if (!this.hasSpaceForContent(requiredHeight)) {
      this.addNewPage();
    }
  }

  private addHeader(): void {
    const settings = this.customSettings;
    const headerColor = settings?.colors?.header || '#2980b9';
    const [r, g, b] = this.hexToRgb(headerColor);
    const fontSize = settings?.fontSize?.header || 16;
    
    // Professional header with custom color
    this.doc.setFillColor(r, g, b);
    this.doc.rect(0, 0, this.pageWidth, 14, 'F');
    
    this.doc.setFontSize(fontSize);
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('TAX INVOICE', this.pageWidth / 2, 9, { align: 'center' });
    
    this.doc.setTextColor(0, 0, 0);
    this.currentY = settings?.margins?.top || 16; // Reduced from 20 to 16
  }

  private addCompanySection(companyDetails: TallyCompanyDetails): void {
    const settings = this.customSettings;
    const fontSize = settings?.fontSize?.company || 14;
    const lineHeight = settings?.spacing?.lineHeight || 5;
    
    // Move company section down - reduced gap for tighter layout
    this.currentY += 8; // Reduced from 25 to 8 for much tighter spacing
    
    // Company name - with custom font size
    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', 'bold');
    const companyName = this.getCompanyName(companyDetails);
    const maxNameWidth = this.pageWidth - 2 * this.margin - 80;
    const truncatedName = this.fitTextToWidth(companyName, maxNameWidth, fontSize);
    this.doc.text(truncatedName, this.margin, this.currentY);
    this.currentY += lineHeight + 2;

    // Company address with custom line height
    this.doc.setFontSize(Math.max(fontSize - 4, 8));
    this.doc.setFont('helvetica', 'normal');
    this.addCompanyAddress(companyDetails, lineHeight);

    // Company contact details
    this.addCompanyContactDetails(companyDetails, lineHeight);

    // Remove the border around company section for cleaner look
    // this.doc.setDrawColor(200, 200, 200);
    // this.doc.rect(this.margin - 2, startY - 3, this.pageWidth - 2 * this.margin + 4, this.currentY - startY + 3);
    
    this.currentY += settings?.spacing?.sectionGap || 8;
  }

  // Helper method to fit text to a specific width
  private fitTextToWidth(text: string, maxWidth: number, fontSize: number): string {
    this.doc.setFontSize(fontSize);
    const textWidth = this.doc.getTextWidth(text);
    if (textWidth <= maxWidth) return text;
    
    // Truncate text to fit
    let truncated = text;
    while (this.doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 1) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  }

  private getCompanyName(companyDetails: TallyCompanyDetails): string {
    return companyDetails.name || 
           companyDetails.basiccompanyformalname || 
           companyDetails.cmptradename || 
           'Company Name Not Available';
  }

  private addCompanyAddress(companyDetails: TallyCompanyDetails, customLineHeight?: number): void {
    const lineHeight = customLineHeight || 5;
    const address = this.getCompanyAddress(companyDetails);
    if (address.length > 0) {
      address.forEach(line => {
        if (line.trim()) {
          this.doc.text(line, this.margin, this.currentY);
          this.currentY += lineHeight;
        }
      });
    }
  }

  private getCompanyAddress(companyDetails: TallyCompanyDetails): string[] {
    if (companyDetails.addresslist && Array.isArray(companyDetails.addresslist)) {
      return companyDetails.addresslist;
    } else if (companyDetails.address && Array.isArray(companyDetails.address)) {
      return companyDetails.address;
    } else if (typeof companyDetails.addresslist === 'string') {
      return [companyDetails.addresslist];
    }
    return [];
  }

  private addCompanyContactDetails(companyDetails: TallyCompanyDetails, customLineHeight?: number): void {
    const lineHeight = customLineHeight || 5;
    
    // GSTIN - Show first and prominently (check multiple possible fields)
    const gstin = companyDetails.loginidentifier || 
                  companyDetails.LOGINIDENTIFIER ||
                  companyDetails.gstin || 
                  companyDetails.gstregistrationnumber ||
                  companyDetails.gstRegistrationNumber;
    
    console.log('Looking for GSTIN in company details:', {
      loginidentifier: companyDetails.loginidentifier,
      LOGINIDENTIFIER: companyDetails.LOGINIDENTIFIER,
      gstin: companyDetails.gstin,
      gstregistrationnumber: companyDetails.gstregistrationnumber,
      allKeys: Object.keys(companyDetails)
    });
    
    if (gstin) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(41, 128, 185); // Blue color for emphasis
      this.doc.text(`GSTIN/UIN: ${gstin}`, this.margin, this.currentY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(0, 0, 0);
      this.currentY += lineHeight;
    } else {
      console.warn('GSTIN not found in company details');
    }

    // Mobile numbers
    const mobileNumbers = this.getCompanyMobileNumbers(companyDetails);
    if (mobileNumbers.length > 0) {
      this.doc.text(`Mobile: ${mobileNumbers.join(', ')}`, this.margin, this.currentY);
      this.currentY += lineHeight;
    }

    // Email
    const email = companyDetails.email || companyDetails.adminemailid;
    if (email) {
      this.doc.text(`Email: ${email}`, this.margin, this.currentY);
      this.currentY += lineHeight;
    }

    // State
    const state = companyDetails.priorstatename || companyDetails.stateName;
    if (state) {
      this.doc.text(`State: ${state}`, this.margin, this.currentY);
      this.currentY += lineHeight;
    }

    // PAN
    const pan = companyDetails.incometaxnumber || companyDetails.pan;
    if (pan) {
      this.doc.text(`PAN: ${pan}`, this.margin, this.currentY);
      this.currentY += 5;
    }
  }

  private getCompanyMobileNumbers(companyDetails: TallyCompanyDetails): string[] {
    if (companyDetails.mobilenumberslist && Array.isArray(companyDetails.mobilenumberslist)) {
      return companyDetails.mobilenumberslist;
    } else if (companyDetails.mobileNumbers && Array.isArray(companyDetails.mobileNumbers)) {
      return companyDetails.mobileNumbers;
    } else if (companyDetails.phone) {
      return [companyDetails.phone];
    }
    return [];
  }

  private addInvoiceInfoSection(voucher: VoucherDetail): void {
    const rightX = this.pageWidth - this.margin - 60;
    const startY = 24; // Reduced from 40 to 24 to align with tighter company section spacing
    
    // Remove the invoice info box - no more rectangle
    // this.doc.setDrawColor(41, 128, 185);
    // this.doc.setLineWidth(1);
    // this.doc.rect(rightX - 5, startY - 3, 65, 35);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(41, 128, 185);

    let infoY = startY + 5;
    this.doc.text('Invoice No:', rightX, infoY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(0, 0, 0);
    // Truncate invoice number if too long
    const truncatedInvoiceNo = this.fitTextToWidth(voucher.number, 30, 10);
    this.doc.text(truncatedInvoiceNo, rightX + 25, infoY);

    infoY += 7;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(41, 128, 185);
    this.doc.text('Date:', rightX, infoY);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(0, 0, 0);
    this.doc.text(this.formatDate(voucher.date), rightX + 25, infoY);

    if (voucher.reference) {
      infoY += 7;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(41, 128, 185);
      this.doc.text('Ref:', rightX, infoY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(0, 0, 0);
      const truncatedRef = this.fitTextToWidth(voucher.reference, 30, 10);
      this.doc.text(truncatedRef, rightX + 25, infoY);
    }
  }

  private formatDate(dateString: string): string {
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

  private addBuyerSection(voucher: VoucherDetail, partyDetails?: any): void {
    // Ensure we have space for buyer section (minimum 30mm)
    this.ensureSpaceForContent(30);
    
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(41, 128, 185);
    this.doc.text('Buyer (Bill To)', this.margin, this.currentY);
    
    this.currentY += 8;
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(0, 0, 0);
    
    // Truncate party name if too long
    const maxPartyWidth = this.pageWidth - 2 * this.margin;
    const truncatedParty = this.fitTextToWidth(voucher.party, maxPartyWidth, 11);
    this.doc.text(truncatedParty, this.margin, this.currentY);
    
    this.currentY += 6;
    this.doc.setFont('helvetica', 'normal');
    
    if (partyDetails?.address) {
      this.doc.text(partyDetails.address, this.margin, this.currentY);
      this.currentY += 5;
    }

    if (voucher.partyGstin) {
      this.doc.text(`GSTIN: ${voucher.partyGstin}`, this.margin, this.currentY);
      this.currentY += 5;
    }

    if (voucher.placeOfSupply) {
      this.doc.text(`Place of Supply: ${voucher.placeOfSupply}`, this.margin, this.currentY);
      this.currentY += 5;
    }

    this.currentY += 5;
  }

  private addItemsTable(voucher: VoucherDetail): void {
    const settings = this.settings || {};
    
    // Calculate comprehensive height requirements
    const headerHeight = 8;
    const rowHeight = 6;
    const taxSummaryHeight = 80; // Full tax summary section
    const footerHeight = 25; // Footer and signature space
    const bufferSpace = 10; // Safety margin
    
    const totalItemsHeight = headerHeight + (voucher.items.length * rowHeight);
    const totalRequiredHeight = totalItemsHeight + taxSummaryHeight + footerHeight + bufferSpace;
    const availableSpace = this.pageHeight - this.currentY - this.bottomMargin;
    
    // Smart pagination decision
    if (totalRequiredHeight > availableSpace) {
      // Calculate how many items can fit with tax summary on current page
      const spaceForTableAndSummary = availableSpace - taxSummaryHeight - footerHeight - bufferSpace;
      const maxItemsOnCurrentPage = Math.floor((spaceForTableAndSummary - headerHeight) / rowHeight);
      
      // Smart decision: should we split or move everything to next page?
      const itemsPercentage = maxItemsOnCurrentPage / voucher.items.length;
      
      if (itemsPercentage < 0.5 || maxItemsOnCurrentPage < 4) {
        // Too few items would fit - move entire table to next page for professional layout
        console.log('Moving entire items table to next page for better layout');
        this.addNewPage();
        this.renderCompleteItemsTable(voucher, settings);
      } else {
        // Split intelligently - but avoid orphaned items
        const remainingItems = voucher.items.length - maxItemsOnCurrentPage;
        
        if (remainingItems > 0 && remainingItems < 4) {
          // Avoid orphaned items by moving a few more to next page
          const adjustedItemsThisPage = Math.max(4, maxItemsOnCurrentPage - 3);
          console.log(`Smart split: ${adjustedItemsThisPage} items on current page, ${voucher.items.length - adjustedItemsThisPage} on next page`);
          this.renderSplitItemsTable(voucher, settings, adjustedItemsThisPage);
        } else {
          console.log(`Normal split: ${maxItemsOnCurrentPage} items on current page, ${remainingItems} on next page`);
          this.renderSplitItemsTable(voucher, settings, maxItemsOnCurrentPage);
        }
      }
    } else {
      // Everything fits on current page
      console.log('All items and summary fit on current page');
      this.renderCompleteItemsTable(voucher, settings);
    }
  }

  private renderCompleteItemsTable(voucher: VoucherDetail, settings: any): void {
    // Ensure minimum space for table header
    this.ensureSpaceForContent(15);
    
    const columnWidths = this.getColumnWidths();
    const tableData = this.prepareTableData(voucher);
    
    this.renderTableWithAutoTable(tableData, columnWidths, settings, 'Complete Items Table');
    this.currentY = (this.doc as any).lastAutoTable.finalY + 5;
  }

  private renderSplitItemsTable(voucher: VoucherDetail, settings: any, itemsOnFirstPage: number): void {
    const columnWidths = this.getColumnWidths();
    
    // First page items
    const firstPageItems = voucher.items.slice(0, itemsOnFirstPage);
    const firstPageData = firstPageItems.map((item, index) => [
      (index + 1).toString(),
      item.stockItem,
      item.hsn || '',
      `${item.quantity.toFixed(2)}\n${item.unit || 'Pcs'}`,
      `${item.rate.toFixed(2)}\nPcs`,
      item.discountPercent ? `${item.discountPercent.toFixed(2)}\n%` : '',
      item.amount.toFixed(2)
    ]);
    
    console.log(`Rendering ${firstPageItems.length} items on first page`);
    this.renderTableWithAutoTable(firstPageData, columnWidths, settings, 'Items Table (Page 1)');
    this.currentY = (this.doc as any).lastAutoTable.finalY + 5;
    
    // Add "Continued on next page" indicator
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'italic');
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('(Continued on next page...)', this.pageWidth - this.margin, this.currentY, { align: 'right' });
    
    // Move to next page for remaining items
    this.addNewPage();
    
    // Remaining items
    const remainingItems = voucher.items.slice(itemsOnFirstPage);
    const remainingData = remainingItems.map((item, index) => [
      (itemsOnFirstPage + index + 1).toString(),
      item.stockItem,
      item.hsn || '',
      `${item.quantity.toFixed(2)}\n${item.unit || 'Pcs'}`,
      `${item.rate.toFixed(2)}\nPcs`,
      item.discountPercent ? `${item.discountPercent.toFixed(2)}\n%` : '',
      item.amount.toFixed(2)
    ]);
    
    console.log(`Rendering ${remainingItems.length} items on second page`);
    
    // Add "Continued from previous page" indicator
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'italic');
    this.doc.setTextColor(100, 100, 100);
    this.doc.text('(Continued from previous page)', this.margin, this.currentY);
    this.currentY += 8;
    
    this.renderTableWithAutoTable(remainingData, columnWidths, settings, 'Items Table (Page 2)', true);
    this.currentY = (this.doc as any).lastAutoTable.finalY + 5;
  }

  private getColumnWidths() {
    return {
      sl: 14,
      description: 78,
      hsn: 22,
      qty: 20,
      rate: 22,
      disc: 16,
      amount: 24
    };
  }

  private prepareTableData(voucher: VoucherDetail): string[][] {
    return voucher.items.map((item, index) => [
      (index + 1).toString(),
      item.stockItem,
      item.hsn || '',
      `${item.quantity.toFixed(2)}\n${item.unit || 'Pcs'}`,
      `${item.rate.toFixed(2)}\nPcs`,
      item.discountPercent ? `${item.discountPercent.toFixed(2)}\n%` : '',
      item.amount.toFixed(2)
    ]);
  }

  private renderTableWithAutoTable(
    tableData: string[][],
    columnWidths: any,
    settings: any,
    title: string,
    isContinuation: boolean = false
  ): void {
    console.log(`Rendering ${title} with ${tableData.length} rows`);
    
    autoTable(this.doc, {
      startY: this.currentY,
      head: [[
        'Sl No.',
        'Description of Goods',
        'HSN/SAC',
        'Quantity',
        'Rate per',
        'Disc %',
        'Amount'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: this.hexToRgb(settings.colors?.header || '#4472C4'),
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 2,
        halign: 'center',
        valign: 'middle',
        minCellHeight: 8
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 1,
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        valign: 'middle',
        minCellHeight: 6
      },
      columnStyles: {
        0: { cellWidth: columnWidths.sl, halign: 'center', fontSize: 7 },
        1: { cellWidth: columnWidths.description, halign: 'left', fontSize: 7 },
        2: { cellWidth: columnWidths.hsn, halign: 'center', fontSize: 7 },
        3: { cellWidth: columnWidths.qty, halign: 'center', fontSize: 7 },
        4: { cellWidth: columnWidths.rate, halign: 'center', fontSize: 7 },
        5: { cellWidth: columnWidths.disc, halign: 'center', fontSize: 7 },
        6: { cellWidth: columnWidths.amount, halign: 'right', fontSize: 7 }
      },
      margin: { left: this.margin - 3, right: this.margin - 3 },
      styles: {
        overflow: 'linebreak',
        cellWidth: 'auto'
      },
      showHead: isContinuation ? 'everyPage' : 'firstPage'
    });
  }

  // Helper to convert hex to RGB
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
      : [41, 128, 185];
  }

  private addTaxSummary(voucher: VoucherDetail): void { 
    // Calculate total height needed for tax summary section
    const estimatedSummaryHeight = 80; // Conservative estimate for all summary boxes
    
    // Check if we have enough space for the entire tax summary section
    if (!this.hasSpaceForContent(estimatedSummaryHeight)) {
      this.addNewPage();
    }
    
    // Convert amounts to words
    const totalAmountInWords = this.numberToWords(voucher.finalAmount);
    
    // Create left side boxes (Amount in words and Terms & Conditions)
    const leftBoxWidth = 96; // Combined width of first two columns from items table
    
    // Add Amount in words box
    autoTable(this.doc, {
      startY: this.currentY,
      body: [
        [`Amount in words:\n${totalAmountInWords} Only`]
      ],
      theme: 'grid',
      bodyStyles: {
        fontSize: 9,
        cellPadding: 4,
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        valign: 'top',
        minCellHeight: 20,
        fillColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { 
          cellWidth: leftBoxWidth, 
          halign: 'left'
        }
      },
      margin: { 
        left: this.margin - 3,
        right: this.margin - 3 
      },
      showHead: false
    });

    const amountBoxEndY = (this.doc as any).lastAutoTable.finalY;

    // Add Terms & Conditions box below Amount in words
    autoTable(this.doc, {
      startY: amountBoxEndY,
      body: [
        ['Terms & Conditions:\n1. Goods once sold will not be returned.\n2. All disputes are subject to KAMAKSHYANAGAR jurisdiction.\n3. Payment within 7days otherwise 18% interest will be charged per anumm form the date of invoice.\n\nDeclaration:\nWe declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.']
      ],
      theme: 'grid',
      bodyStyles: {
        fontSize: 7,
        cellPadding: 4,
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        valign: 'top',
        minCellHeight: 25, // Reduced height to align with tax summary
        fillColor: [255, 255, 255],
        fontStyle: 'normal'
      },
      columnStyles: {
        0: { 
          cellWidth: leftBoxWidth, 
          halign: 'left'
        }
      },
      margin: { 
        left: this.margin - 3,
        right: this.margin - 3 
      },
      showHead: false
    });

    // Remove the separate Declaration box - it's now part of Terms & Conditions

    // Create right side tax summary box
    const rightSummaryData = [];
    rightSummaryData.push(['Sub Total:', voucher.subTotal.toFixed(2)]);
    
    if (voucher.gstDetails.cgst > 0) {
      rightSummaryData.push([`CGST @${voucher.gstDetails.cgstRate}%`, voucher.gstDetails.cgst.toFixed(2)]);
    }
    
    if (voucher.gstDetails.sgst > 0) {
      rightSummaryData.push([`SGST @${voucher.gstDetails.sgstRate}%`, voucher.gstDetails.sgst.toFixed(2)]);
    }
    
    if (voucher.gstDetails.igst > 0) {
      rightSummaryData.push([`IGST @${voucher.gstDetails.igstRate}%`, voucher.gstDetails.igst.toFixed(2)]);
    }
    
    // Add discount if applicable
    if (voucher.totalDiscount && voucher.totalDiscount > 0) {
      rightSummaryData.push(['Discount:', `(-) ${voucher.totalDiscount.toFixed(2)}`]);
    } else if (Math.abs(voucher.roundOff) > 0.01) {
      const sign = voucher.roundOff >= 0 ? '' : '(-)';
      rightSummaryData.push(['Rounding Off:', `${sign}${Math.abs(voucher.roundOff).toFixed(2)}`]);
    }

    rightSummaryData.push(['Total:', voucher.finalAmount.toFixed(2)]);

    const totalRowIndex = rightSummaryData.length - 1;

    // Position the right tax summary box next to the left boxes
    autoTable(this.doc, {
      startY: this.currentY,
      body: rightSummaryData,
      theme: 'grid',
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
        lineWidth: 0.5,
        lineColor: [0, 0, 0],
        textColor: [0, 0, 0],
        valign: 'middle',
        minCellHeight: 8,
        fillColor: [255, 255, 255]
      },
      columnStyles: {
        0: { 
          cellWidth: 55, // Reduced label column width
          halign: 'left',
          fontStyle: 'normal'
        },
        1: { 
          cellWidth: 35, // Reduced amount column width
          halign: 'right',
          fontStyle: 'normal'
        }
      },
      margin: { 
        left: this.margin + leftBoxWidth + 7, // Proper gap from left boxes
        right: this.margin // Standard right margin
      },
      showHead: false,
      didParseCell: function(data: any) {
        // Style the total row
        if (data.row.index === totalRowIndex) {
          data.cell.styles.fillColor = [240, 248, 255]; // Light blue background for total
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [0, 51, 102]; // Darker blue text
          data.cell.styles.fontSize = 10; // Larger font for total
        }
        // Style subtotal row
        else if (data.row.index === 0) {
          data.cell.styles.fillColor = [248, 249, 250]; // Light gray for subtotal
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10;
  }

  private numberToWords(amount: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const integerPart = Math.floor(amount);
    
    if (integerPart === 0) return 'Zero';
    
    const convertHundreds = (num: number): string => {
      let result = '';
      const hundreds = Math.floor(num / 100);
      const remainder = num % 100;
      
      if (hundreds > 0) {
        result += ones[hundreds] + ' Hundred ';
      }
      
      if (remainder >= 20) {
        result += tens[Math.floor(remainder / 10)] + ' ';
        result += ones[remainder % 10];
      } else if (remainder >= 10) {
        result += teens[remainder - 10];
      } else if (remainder > 0) {
        result += ones[remainder];
      }
      
      return result.trim();
    };
    
    // Handle numbers up to crores (10,000,000)
    if (integerPart >= 10000000) {
      const crores = Math.floor(integerPart / 10000000);
      const remainder = integerPart % 10000000;
      let result = convertHundreds(crores) + ' Crore ';
      if (remainder > 0) {
        result += this.numberToWords(remainder);
      }
      return result.trim();
    }
    
    // Handle lakhs (100,000 to 9,999,999)
    if (integerPart >= 100000) {
      const lakhs = Math.floor(integerPart / 100000);
      const remainder = integerPart % 100000;
      let result = convertHundreds(lakhs) + ' Lakh ';
      if (remainder > 0) {
        result += this.numberToWords(remainder);
      }
      return result.trim();
    }
    
    // Handle thousands (1,000 to 99,999)
    if (integerPart >= 1000) {
      const thousands = Math.floor(integerPart / 1000);
      const remainder = integerPart % 1000;
      let result = convertHundreds(thousands) + ' Thousand ';
      if (remainder > 0) {
        result += convertHundreds(remainder);
      }
      return result.trim();
    }
    
    // Handle hundreds (0 to 999)
    return convertHundreds(integerPart);
  }

  private addFooterSection(): void {
    // Skip the bank details section completely - no output
    this.currentY += 5; // Just add some space
  }

  private addDeclarationAndSignature(companyDetails: TallyCompanyDetails): void {
    // Ensure we have enough space for signatures (minimum 25mm)
    const signatureHeight = 25;
    if (!this.hasSpaceForContent(signatureHeight)) {
      this.addNewPage();
    }
    
    // Position signatures with adequate space from the content above
    const signatureY = Math.max(this.currentY + 15, this.pageHeight - 40); // Ensure minimum distance from bottom
    
    // Customer signature on the left (bottom left) - completely outside all boxes
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.text('Customer Signature', this.margin, signatureY);
    
    // Company signature and logo on the right (bottom right) - no line above
    const rightSignatureX = this.pageWidth - this.margin - 60;
    this.doc.text(`for ${this.getCompanyName(companyDetails)}`, rightSignatureX, signatureY);
    
    // Authorised signatory text below the company name - no line above
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.text('Authorised Signatory', rightSignatureX, signatureY + 8);
    
    // Update currentY to reflect the space used
    this.currentY = signatureY + 15;
  }

  private addWatermark(): void {
    if (!this.settings.styling.showWatermark) return;
    
    const watermarkText = this.settings.styling.watermarkText || 'DRAFT';
    this.doc.saveGraphicsState();
    this.doc.setGState({ opacity: 0.1 });
    this.doc.setFontSize(60);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(128, 128, 128);
    
    // Rotate and center the watermark
    const pageWidth = this.doc.internal.pageSize.getWidth();
    const pageHeight = this.doc.internal.pageSize.getHeight();
    
    this.doc.text(watermarkText, pageWidth / 2, pageHeight / 2, {
      angle: 45,
      align: 'center'
    });
    
    // Restore state
    this.doc.restoreGraphicsState();
  }

  private addPageNumbers(): void {
    if (!this.settings.styling.showPageNumbers) return;
    
    const pageCount = this.doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin - 20,
        this.pageHeight - 10
      );
    }
  }

  private downloadPDF(blob: Blob, fileName: string): void {
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
