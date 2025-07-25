import BaseApiService from '../baseApiService';

export type DateRangeOption = 
  | 'last7days'
  | 'lastMonth'
  | 'currentMonth'
  | 'last3months'
  | 'currentYear'
  | 'lastYear'
  | 'custom';

export interface DateRange {
  fromDate: Date;
  toDate: Date;
  label: string;
}

export interface SalesVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  partyName: string;
  amount: number;
  narration: string;
  reference: string;
  guid: string;
  alterid: string;
  voucherType: string;
  voucherRetainKey: string;
  stockItems?: StockItem[];
  // Additional fields for complete voucher information
  taxableAmount?: number;
  totalTax?: number;
  itemCount?: number;
  gstBreakdown?: GSTBreakdown;
  roundOff?: number;
  totalDiscount?: number;
}

export interface GSTBreakdown {
  cgst: number;
  sgst: number;
  igst: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  total: number;
}

export interface StockItem {
  name: string;
  rate: string;
  actualQty: string;
  billedQty: string;
  amount: number;
  hsn?: string;
  discount?: number;
  discountPercent?: number;
}

export class SalesApiService extends BaseApiService {

  /**
   * Fetch individual voucher details directly from Tally by voucher GUID
   * This method fetches a single voucher with complete details including inventory
   */
  async fetchVoucherDetails(
    companyName: string,
    voucherGuid: string
  ): Promise<any> {
    if (!companyName) {
      throw new Error('No company selected. Please select a company first.');
    }

    if (!voucherGuid) {
      throw new Error('Voucher GUID is required.');
    }

    const xmlRequest = `<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Voucher Register</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
          <MASTERGUID>${voucherGuid}</MASTERGUID>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <EXPLODEFLAG>Yes</EXPLODEFLAG>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      
      // Parse the XML response and find the voucher
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(response, 'text/xml');
      
      // Find the voucher in the response
      const vouchers = xmlDoc.querySelectorAll('VOUCHER');
      const targetVoucher = Array.from(vouchers).find(voucher => {
        const guid = voucher.getAttribute('REMOTEID') || voucher.getAttribute('GUID') || '';
        return guid === voucherGuid;
      });
      
      if (!targetVoucher) {
        throw new Error('Voucher not found in response');
      }
      
      // Parse and extract the voucher details
      const details = this.extractVoucherDetails(targetVoucher);
      
      if (!details) {
        throw new Error('Voucher not found or details could not be extracted');
      }
      
      return details;
      
    } catch (error) {
      throw new Error(`Failed to fetch voucher details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Extract detailed voucher information from a voucher XML element
   */
  private extractVoucherDetails(voucherElement: Element): any {
    // Basic voucher information
    const voucherNumber = voucherElement.querySelector('VOUCHERNUMBER')?.textContent || '';
    const date = voucherElement.querySelector('DATE')?.textContent || '';
    const partyName = voucherElement.querySelector('PARTYLEDGERNAME')?.textContent || '';
    const amount = Math.abs(parseFloat(voucherElement.querySelector('AMOUNT')?.textContent || '0'));
    const reference = voucherElement.querySelector('REFERENCE')?.textContent || '';
    const voucherType = voucherElement.querySelector('VOUCHERTYPENAME')?.textContent || '';
    
    // Extract inventory entries (items)
    const inventoryEntries: any[] = [];
    const inventoryElements = voucherElement.querySelectorAll('ALLINVENTORYENTRIES\\.LIST');
    
    inventoryElements.forEach(entry => {
      const stockItemName = entry.querySelector('STOCKITEMNAME')?.textContent || '';
      const actualQty = entry.querySelector('ACTUALQTY')?.textContent || '';
      const billedQty = entry.querySelector('BILLEDQTY')?.textContent || '';
      const rate = entry.querySelector('RATE')?.textContent || '';
      const itemAmount = Math.abs(parseFloat(entry.querySelector('AMOUNT')?.textContent || '0'));
      const hsnCode = entry.querySelector('GSTHSNNAME')?.textContent || '';
      const taxability = entry.querySelector('GSTOVRDNTAXABILITY')?.textContent || '';
      const typeOfSupply = entry.querySelector('GSTOVRDNTYPEOFSUPPLY')?.textContent || '';
      
      // Extract GST rates from RATEDETAILS.LIST
      const rateDetails = entry.querySelectorAll('RATEDETAILS\\.LIST');
      let cgstRate = 0, sgstRate = 0, igstRate = 0;
      
      rateDetails.forEach(rateDetail => {
        const dutyHead = rateDetail.querySelector('GSTRATEDUTYHEAD')?.textContent || '';
        const rate = parseFloat(rateDetail.querySelector('GSTRATE')?.textContent || '0');
        
        if (dutyHead === 'CGST') cgstRate = rate;
        else if (dutyHead === 'SGST/UTGST') sgstRate = rate;
        else if (dutyHead === 'IGST') igstRate = rate;
      });
      
      if (stockItemName) {
        inventoryEntries.push({
          stockItemName,
          quantity: billedQty || actualQty,
          rate,
          amount: itemAmount,
          hsnCode: hsnCode || 'N/A',
          taxability,
          typeOfSupply,
          cgstRate,
          sgstRate,
          igstRate,
          totalGstRate: cgstRate + sgstRate + igstRate
        });
      }
    });
    
    // Calculate totals
    const totalTaxableAmount = inventoryEntries.reduce((sum, item) => sum + item.amount, 0);
    const totalTax = amount - totalTaxableAmount;
    
    return {
      voucherNumber,
      date: this.formatTallyDate(date),
      partyName: partyName.replace(/&amp;/g, '&').trim(),
      totalAmount: amount,
      taxableAmount: totalTaxableAmount,
      totalTax: totalTax,
      reference,
      voucherType,
      inventoryEntries,
      itemCount: inventoryEntries.length
    };
  }
  
  /**
   * Get predefined date range options
   */
  getDateRangeOptions(): { value: DateRangeOption; label: string }[] {
    return [
      { value: 'currentMonth', label: 'Current Month' },
      { value: 'lastMonth', label: 'Previous Month' },
      { value: 'last3months', label: 'Last 3 Months' },
      { value: 'currentYear', label: 'Current Year' },
      { value: 'lastYear', label: 'Previous Year' },
      { value: 'custom', label: 'Custom Range' }
    ];
  }

  /**
   * Calculate date range based on option
   */
  getDateRange(option: DateRangeOption, customFromDate?: Date, customToDate?: Date): DateRange {
    const today = new Date();
    let fromDate: Date;
    let toDate: Date;
    let label: string;

    switch (option) {
      case 'last7days':
        fromDate = new Date(today);
        fromDate.setDate(today.getDate() - 7);
        toDate = new Date(today);
        label = 'Last 7 Days';
        break;

      case 'lastMonth':
        fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        toDate = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
        label = `${fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
        break;

      case 'currentMonth':
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of current month
        label = `${fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (Current)`;
        break;

      case 'last3months':
        fromDate = new Date(today.getFullYear(), today.getMonth() - 3, 1);
        toDate = new Date(today);
        label = 'Last 3 Months';
        break;

      case 'currentYear':
        // Financial year starts from April 1st in India
        const currentCalendarYear = today.getFullYear();
        const currentCalendarMonth = today.getMonth(); // 0-indexed
        
        if (currentCalendarMonth >= 3) { // April onwards (months 3-11)
          fromDate = new Date(currentCalendarYear, 3, 1); // April 1st current year
          toDate = new Date(today);
        } else { // January to March (months 0-2)
          fromDate = new Date(currentCalendarYear - 1, 3, 1); // April 1st previous year
          toDate = new Date(today);
        }
        
        const fyStartYear = fromDate.getFullYear();
        const fyEndYear = fyStartYear + 1;
        label = `FY ${fyStartYear}-${fyEndYear.toString().slice(-2)} (Current Financial Year)`;
        break;

      case 'lastYear':
        // Previous financial year
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        
        let prevFyStartYear, prevFyEndYear;
        if (currentMonth >= 3) { // April onwards
          prevFyStartYear = currentYear - 1;
          prevFyEndYear = currentYear;
        } else { // January to March
          prevFyStartYear = currentYear - 2;
          prevFyEndYear = currentYear - 1;
        }
        
        fromDate = new Date(prevFyStartYear, 3, 1); // April 1st
        toDate = new Date(prevFyEndYear, 2, 31); // March 31st
        label = `FY ${prevFyStartYear}-${prevFyEndYear.toString().slice(-2)} (Previous Financial Year)`;
        break;

      case 'custom':
        fromDate = customFromDate || new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = customToDate || new Date(today);
        label = `${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()}`;
        break;

      default:
        fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
        toDate = new Date(today);
        label = `${fromDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (Current)`;
    }

    return { fromDate, toDate, label };
  }
  
  /**
   * Fetch sales vouchers for a specific date range with complete details
   */
  async getSalesVouchers(
    companyName: string, 
    dateRangeOption: DateRangeOption = 'currentMonth',
    customFromDate?: Date,
    customToDate?: Date
  ): Promise<SalesVoucher[]> {
    
    if (!companyName) {
      throw new Error('No company selected. Please select a company first.');
    }

    const { fromDate, toDate, label } = this.getDateRange(dateRangeOption, customFromDate, customToDate);
    
    const fromDateStr = this.formatDateForTally(fromDate);
    const toDateStr = this.formatDateForTally(toDate);
    
    // Use the proven TDL-based query that works (same as original working query)
    const xmlRequest = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>Sales Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVFROMDATE TYPE="DATE">${fromDateStr}</SVFROMDATE>
        <SVTODATE TYPE="DATE">${toDateStr}</SVTODATE>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="Sales Vouchers" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="Yes" ISOPTION="No" ISINTERNAL="No">
            <TYPE>Voucher</TYPE>
            <FETCH>DATE, VOUCHERNUMBER, PARTYLEDGERNAME, AMOUNT, VOUCHERTYPENAME, GUID, VCHTYPE</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      
      const result = this.parseSalesVouchersResponse(response);
      
      return result;
    } catch (error) {
      throw new Error(`Failed to fetch sales data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch current month sales vouchers (legacy method)
   */
  async getLast7DaysSalesVouchers(companyName: string): Promise<SalesVoucher[]> {
    return this.getSalesVouchers(companyName, 'currentMonth');
  }

  /**
   * Parse sales vouchers XML response 
   */
  private parseSalesVouchersResponse(xmlText: string): SalesVoucher[] {
    try {
      // Clean XML to remove invalid characters before parsing
      const cleanedXml = this.cleanXmlForParsing(xmlText);
      
      // Try alternative parsing methods for large XML
      const doc = this.parseXML(cleanedXml);
      
      // Check for parsing errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error('XML parsing failed');
      }
      
      // Try different selectors to find vouchers
      let vouchers = doc.querySelectorAll('VOUCHER');
      
      if (vouchers.length === 0) {
        // Try case-insensitive
        vouchers = doc.querySelectorAll('voucher');
      }
      
      if (vouchers.length === 0) {
        // Try with namespace
        vouchers = doc.querySelectorAll('*[tagName="VOUCHER"], *[nodeName="VOUCHER"]');
      }
      
      // If still no vouchers, let's inspect the XML structure
      if (vouchers.length === 0) {
        const collections = doc.querySelectorAll('COLLECTION');
        
        collections.forEach((collection, index) => {
          // console.log(`Collection ${index + 1} children:`, Array.from(collection.children).map(c => c.nodeName));
        });
      }
      
      // Collect all voucher types for analysis
      const voucherTypes = new Map<string, number>();
      vouchers.forEach((voucher) => {
        const vchType = voucher.getAttribute('VCHTYPE') || 
                       voucher.getAttribute('TYPE') ||
                       voucher.querySelector('VOUCHERTYPENAME')?.textContent ||
                       voucher.querySelector('VOUCHERTYPE')?.textContent ||
                       'Unknown';
        voucherTypes.set(vchType, (voucherTypes.get(vchType) || 0) + 1);
      });
      
      const salesVouchers: SalesVoucher[] = [];
      
      vouchers.forEach((voucher, index) => {
        try {
          // Extract voucher type - check multiple possible attributes and elements
          const vchType = voucher.getAttribute('VCHTYPE') || 
                         voucher.getAttribute('TYPE') ||
                         voucher.querySelector('VOUCHERTYPENAME')?.textContent ||
                         voucher.querySelector('VOUCHERTYPE')?.textContent ||
                         '';
          
          // Log all child elements for debugging
          const childElements = Array.from(voucher.children).map(child => child.nodeName);
          
          // Extract basic voucher information with detailed logging
          const dateElement = voucher.querySelector('DATE');
          const date = dateElement?.textContent || '';
          
          const voucherNumberElement = voucher.querySelector('VOUCHERNUMBER');
          const voucherNumber = voucherNumberElement?.textContent || '';
          
          const partyNameElement = voucher.querySelector('PARTYLEDGERNAME');
          const partyName = partyNameElement?.textContent || '';
          
          // Extract amount with detailed logging - check multiple possible locations
          const amountElement = voucher.querySelector('AMOUNT');
          let amountText = amountElement?.textContent || '0';
          
          // If no AMOUNT element, try to get from ALLLEDGERENTRIES
          if (!amountText || amountText === '0') {
            const ledgerEntries = voucher.querySelectorAll('ALLLEDGERENTRIES.LIST');
            let totalAmount = 0;
            ledgerEntries.forEach(entry => {
              const entryAmount = entry.querySelector('AMOUNT')?.textContent;
              if (entryAmount) {
                totalAmount += Math.abs(parseFloat(entryAmount) || 0);
              }
            });
            if (totalAmount > 0) {
              amountText = totalAmount.toString();
            }
          }
          
          const amount = Math.abs(parseFloat(amountText) || 0);
          
          // Skip vouchers with no meaningful data
          if (!date && !voucherNumber && !partyName && amount === 0) {
            return;
          }
          
          // Filter for only Tax Invoice vouchers (exact match)
          // Exclude Proforma Invoices and other non-sales vouchers
          if (vchType !== 'Tax Invoice') {
            return;
          }
          
          // Extract GUID for unique ID
          const guidElement = voucher.querySelector('GUID');
          const guid = guidElement?.textContent || '';
          
          // Extract other attributes
          const remoteid = voucher.getAttribute('REMOTEID') || '';
          const vchkey = voucher.getAttribute('VCHKEY') || '';
          
          // Extract inventory details (stock items) from ALLINVENTORYENTRIES.LIST
          const stockItems: StockItem[] = [];
          let totalDiscount = 0;
          const inventoryElements = voucher.querySelectorAll('ALLINVENTORYENTRIES\\.LIST');
          
          inventoryElements.forEach(entry => {
            const stockItemName = entry.querySelector('STOCKITEMNAME')?.textContent || '';
            const actualQty = entry.querySelector('ACTUALQTY')?.textContent || '';
            const billedQty = entry.querySelector('BILLEDQTY')?.textContent || '';
            const rate = entry.querySelector('RATE')?.textContent || '';
            const itemAmount = Math.abs(parseFloat(entry.querySelector('AMOUNT')?.textContent || '0'));
            const hsnCode = entry.querySelector('GSTHSNNAME')?.textContent || '';
            
            // Extract rate and quantity values for proper discount calculation
            const rateValue = parseFloat(rate?.replace(/[^\d.-]/g, '') || '0');
            const qtyValue = parseFloat(billedQty?.replace(/[^\d.-]/g, '') || '0');
            const grossAmount = rateValue * qtyValue;
            const discountPercent = parseFloat(entry.querySelector('DISCOUNT')?.textContent || '0');
            const discountAmount = grossAmount > 0 ? (grossAmount * (discountPercent / 100)) : 0;
            if (stockItemName) {
              stockItems.push({
                name: stockItemName,
                rate: rate,
                actualQty: actualQty,
                billedQty: billedQty,
                amount: itemAmount,
                hsn: hsnCode || 'N/A',
                discount: discountAmount > 0 ? Math.round(discountAmount * 100) / 100 : undefined,
                discountPercent: discountPercent > 0 ? Math.round(discountPercent * 100) / 100 : undefined
              });
              totalDiscount += discountAmount;
            }
          });
          
          // Extract GST breakdown from LEDGERENTRIES.LIST (not ALLLEDGERENTRIES.LIST)
          const gstBreakdown: GSTBreakdown = {
            cgst: 0,
            sgst: 0,
            igst: 0,
            total: 0
          };
          let roundOff = 0;
          
          const ledgerEntries = voucher.querySelectorAll('LEDGERENTRIES\\.LIST');
          ledgerEntries.forEach(entry => {
            const ledgerName = entry.querySelector('LEDGERNAME')?.textContent || '';
            const ledgerAmount = parseFloat(entry.querySelector('AMOUNT')?.textContent || '0');
            
            // Extract GST amounts and rates
            if (ledgerName.toLowerCase().includes('cgst')) {
              gstBreakdown.cgst += Math.abs(ledgerAmount);
              const rateMatch = ledgerName.match(/@(\d+(?:\.\d+)?)%/);
              if (rateMatch && !gstBreakdown.cgstRate) {
                gstBreakdown.cgstRate = parseFloat(rateMatch[1]);
              }
            } else if (ledgerName.toLowerCase().includes('sgst') || ledgerName.toLowerCase().includes('utgst')) {
              gstBreakdown.sgst += Math.abs(ledgerAmount);
              const rateMatch = ledgerName.match(/@(\d+(?:\.\d+)?)%/);
              if (rateMatch && !gstBreakdown.sgstRate) {
                gstBreakdown.sgstRate = parseFloat(rateMatch[1]);
              }
            } else if (ledgerName.toLowerCase().includes('igst')) {
              gstBreakdown.igst += Math.abs(ledgerAmount);
              const rateMatch = ledgerName.match(/@(\d+(?:\.\d+)?)%/);
              if (rateMatch && !gstBreakdown.igstRate) {
                gstBreakdown.igstRate = parseFloat(rateMatch[1]);
              }
            } else if (ledgerName.toLowerCase().includes('rounding') || ledgerName.toLowerCase().includes('round off')) {
              roundOff = ledgerAmount;
            }
          });
          
          gstBreakdown.total = gstBreakdown.cgst + gstBreakdown.sgst + gstBreakdown.igst;
          
          // Extract additional voucher details
          const referenceElement = voucher.querySelector('REFERENCE');
          const reference = referenceElement?.textContent || '';
          
          const narrationElement = voucher.querySelector('NARRATION') || voucher.querySelector('BASICNARRATION');
          const narration = narrationElement?.textContent || '';
          
          // Calculate totals
          const totalItemAmount = stockItems.reduce((sum, item) => sum + item.amount, 0);
          const totalTax = gstBreakdown.total;
          
          const salesVoucher: SalesVoucher = {
            id: remoteid || guid || `voucher_${index}`,
            voucherNumber: voucherNumber || `N/A`,
            date: this.formatTallyDate(date) || 'N/A',
            partyName: partyName.trim() || 'Unknown Customer',
            amount: amount,
            narration: narration || '', // Extracted from voucher
            reference: reference || '', // Extracted from voucher
            guid: guid,
            alterid: '',
            voucherType: vchType || 'Unknown',
            voucherRetainKey: vchkey,
            stockItems: stockItems.length > 0 ? stockItems : undefined,
            taxableAmount: totalItemAmount > 0 ? totalItemAmount : undefined,
            totalTax: totalTax > 0 ? totalTax : undefined,
            itemCount: stockItems.length > 0 ? stockItems.length : undefined,
            gstBreakdown: gstBreakdown.total > 0 ? gstBreakdown : undefined,
            roundOff: roundOff !== 0 ? roundOff : undefined,
            totalDiscount: totalDiscount > 0 ? totalDiscount : undefined
          };
          
          salesVouchers.push(salesVoucher);
        } catch (err) {
          // console.warn(`Error parsing voucher ${index}:`, err);
        }
      });
      
      // Summary logging
      const totalVouchers = vouchers.length;
      const salesVouchersFound = salesVouchers.length;
      const taxInvoiceCount = salesVouchers.filter(v => v.voucherType.toLowerCase().includes('tax invoice')).length;
      const salesInvoiceCount = salesVouchers.filter(v => v.voucherType.toLowerCase().includes('sales invoice')).length;
      const proformaCount = Array.from(voucherTypes.entries()).find(([type]) => type.toLowerCase().includes('proforma'))?.[1] || 0;
      
      // console.log(`📊 PARSING SUMMARY:`);
      // console.log(`   Total vouchers in XML: ${totalVouchers}`);
      // console.log(`   Real sales vouchers found: ${salesVouchersFound}`);
      // console.log(`   ├─ Tax Invoice vouchers: ${taxInvoiceCount}`);
      // console.log(`   ├─ Sales Invoice vouchers: ${salesInvoiceCount}`);
      // console.log(`   └─ Other real sales: ${salesVouchersFound - taxInvoiceCount - salesInvoiceCount}`);
      // console.log(`   Excluded Proforma Invoices: ${proformaCount}`);
      // console.log(`   Other non-sales vouchers: ${totalVouchers - salesVouchersFound - proformaCount}`);
      
      // console.log(`✅ Parsed ${salesVouchers.length} sales vouchers from ${vouchers.length} total vouchers`);
      return salesVouchers;
      
    } catch (error) {
      throw new Error('Failed to parse sales vouchers data');
    }
  }

  /**
   * Clean XML text to remove invalid characters that cause parsing errors
   */
  private cleanXmlForParsing(xmlText: string): string {
    // Remove invalid XML character references that cause parsing errors
    // Common problematic patterns in Tally XML:
    // - Invalid char refs like &#4; (control characters)
    // - Malformed entities
    
    let cleaned = xmlText;
    
    // Remove invalid character references (control characters 0-8, 11, 12, 14-31)
    // Keep valid ones: &#9; (tab), &#10; (newline), &#13; (carriage return)
    cleaned = cleaned.replace(/&#([0-8]|1[1-2]|1[4-9]|2[0-9]|3[01]);/g, '');
    
    // Remove any remaining problematic character references
    cleaned = cleaned.replace(/&#x[0-8A-Fa-f];/g, '');
    
    // Remove actual control characters that might be in the text
    // eslint-disable-next-line no-control-regex
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    
    return cleaned;
  }

  /**
   * Format date for Tally API (YYYYMMDD format)
   */
  private formatDateForTally(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Format Tally date (YYYYMMDD) to readable format
   */
  private formatTallyDate(tallyDate: string): string {
    if (!tallyDate || tallyDate.length !== 8) return tallyDate;
    
    const year = tallyDate.substring(0, 4);
    const month = tallyDate.substring(4, 6);
    const day = tallyDate.substring(6, 8);
    
    try {
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    } catch {
      return tallyDate;
    }
  }
}

// Export both named and default exports
export default SalesApiService;
