import BaseApiService from '../baseApiService';

export interface VoucherDetail {
  id: string;
  voucherNumber: string;
  date: string;
  partyName: string;
  amount: number;
  voucherType: string;
  reference: string;
  narration?: string;
  inventoryEntries: InventoryEntry[];
  ledgerEntries: LedgerEntry[];
  gstDetails: GstDetail[];
  totalAmount: number;
  totalTax: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalCess: number;
}

export interface InventoryEntry {
  stockItemName: string;
  quantity: string;
  rate: string;
  amount: number;
  discount?: number;
  hsnCode?: string;
  gstRate?: number;
  taxability: string;
  typeOfSupply: string;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  cessAmount?: number;
}

export interface LedgerEntry {
  ledgerName: string;
  amount: number;
  isDebit: boolean;
  gstClass?: string;
  gstRate?: number;
}

export interface GstDetail {
  hsnCode: string;
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  cessRate: number;
  cessAmount: number;
  totalTax: number;
}

export class VoucherDetailApiService extends BaseApiService {
  
  /**
   * Fetch detailed information for a specific voucher by GUID
   */
  async getVoucherDetails(companyName: string, voucherGuid: string): Promise<VoucherDetail> {
    if (!companyName || !voucherGuid) {
      throw new Error('Company name and voucher GUID are required');
    }

    // Use a simpler TDL query that won't crash Tally
    const xmlRequest = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>Voucher Details</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="Voucher Details" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="Yes" ISOPTION="No" ISINTERNAL="No">
            <TYPE>Voucher</TYPE>
            <FILTER>VoucherFilter</FILTER>
            <FETCH>DATE, VOUCHERNUMBER, PARTYLEDGERNAME, AMOUNT, VOUCHERTYPENAME, REFERENCE, NARRATION, GUID</FETCH>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="VoucherFilter">$$IsEqual:$GUID:"${voucherGuid}"</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      
      const result = this.parseVoucherDetailsResponse(response);
      
      return result;
    } catch (error) {
      console.error('Error fetching voucher details:', error);
      throw new Error(`Failed to fetch voucher details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse the detailed voucher XML response
   */
  private parseVoucherDetailsResponse(xmlText: string): VoucherDetail {
    try {
      
      // Clean XML to remove invalid characters
      const cleanedXml = this.cleanXmlForParsing(xmlText);
      const doc = this.parseXML(cleanedXml);
      
      // Check for parsing errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        console.error('❌ XML Parser Error:', parserError.textContent);
        throw new Error('XML parsing failed');
      }
      
      const voucher = doc.querySelector('VOUCHER');
      if (!voucher) {
        throw new Error('No voucher found in response');
      }
      
      // Extract basic voucher information
      const voucherNumber = voucher.querySelector('VOUCHERNUMBER')?.textContent || '';
      const date = voucher.querySelector('DATE')?.textContent || '';
      const partyName = voucher.querySelector('PARTYLEDGERNAME')?.textContent || '';
      const amount = Math.abs(parseFloat(voucher.querySelector('AMOUNT')?.textContent || '0'));
      const voucherType = voucher.querySelector('VOUCHERTYPENAME')?.textContent || '';
      const reference = voucher.querySelector('REFERENCE')?.textContent || '';
      const narration = voucher.querySelector('NARRATION')?.textContent || '';
      const guid = voucher.querySelector('GUID')?.textContent || '';
      
      // Parse inventory entries
      const inventoryEntries = this.parseInventoryEntries(voucher);
      
      // Parse ledger entries
      const ledgerEntries = this.parseLedgerEntries(voucher);
      
      // Calculate GST details
      const gstDetails = this.calculateGstDetails(inventoryEntries, ledgerEntries);
      
      // Calculate totals
      const totalAmount = inventoryEntries.reduce((sum, item) => sum + item.amount, 0);
      const totalTax = gstDetails.reduce((sum, gst) => sum + gst.totalTax, 0);
      const totalCgst = gstDetails.reduce((sum, gst) => sum + gst.cgstAmount, 0);
      const totalSgst = gstDetails.reduce((sum, gst) => sum + gst.sgstAmount, 0);
      const totalIgst = gstDetails.reduce((sum, gst) => sum + gst.igstAmount, 0);
      const totalCess = gstDetails.reduce((sum, gst) => sum + gst.cessAmount, 0);
      
      return {
        id: guid,
        voucherNumber,
        date: this.formatTallyDate(date),
        partyName: partyName.trim(),
        amount,
        voucherType,
        reference,
        narration,
        inventoryEntries,
        ledgerEntries,
        gstDetails,
        totalAmount,
        totalTax,
        totalCgst,
        totalSgst,
        totalIgst,
        totalCess
      };
      
    } catch (error) {
      console.error('❌ Error parsing voucher details XML:', error);
      throw new Error('Failed to parse voucher details');
    }
  }
  
  /**
   * Parse inventory entries from voucher
   */
  private parseInventoryEntries(voucher: Element): InventoryEntry[] {
    const inventoryEntries: InventoryEntry[] = [];
    const inventoryElements = voucher.querySelectorAll('ALLINVENTORYENTRIES\\.LIST');
    
    inventoryElements.forEach((entry) => {
      const stockItemName = entry.querySelector('STOCKITEMNAME')?.textContent || '';
      const actualQty = entry.querySelector('ACTUALQTY')?.textContent || '';
      const billedQty = entry.querySelector('BILLEDQTY')?.textContent || '';
      const rate = entry.querySelector('RATE')?.textContent || '';
      const amount = parseFloat(entry.querySelector('AMOUNT')?.textContent || '0');
      const discount = parseFloat(entry.querySelector('DISCOUNT')?.textContent || '0');
      const hsnCode = entry.querySelector('GSTHSNNAME')?.textContent || '';
      const taxability = entry.querySelector('GSTOVRDNTAXABILITY')?.textContent || '';
      const typeOfSupply = entry.querySelector('GSTOVRDNTYPEOFSUPPLY')?.textContent || '';
      
      if (stockItemName) {
        inventoryEntries.push({
          stockItemName,
          quantity: billedQty || actualQty,
          rate,
          amount: Math.abs(amount),
          discount: discount || undefined,
          hsnCode: hsnCode || undefined,
          taxability,
          typeOfSupply
        });
      }
    });
    
    return inventoryEntries;
  }
  
  /**
   * Parse ledger entries from voucher
   */
  private parseLedgerEntries(voucher: Element): LedgerEntry[] {
    const ledgerEntries: LedgerEntry[] = [];
    const ledgerElements = voucher.querySelectorAll('ALLLEDGERENTRIES\\.LIST');
    
    ledgerElements.forEach((entry) => {
      const ledgerName = entry.querySelector('LEDGERNAME')?.textContent || '';
      const amount = parseFloat(entry.querySelector('AMOUNT')?.textContent || '0');
      const isDeemedPositive = entry.querySelector('ISDEEMEDPOSITIVE')?.textContent === 'Yes';
      const gstClass = entry.querySelector('GSTCLASS')?.textContent || '';
      const gstRate = parseFloat(entry.querySelector('GSTRATE')?.textContent || '0');
      
      if (ledgerName) {
        ledgerEntries.push({
          ledgerName,
          amount: Math.abs(amount),
          isDebit: !isDeemedPositive,
          gstClass: gstClass || undefined,
          gstRate: gstRate || undefined
        });
      }
    });
    
    return ledgerEntries;
  }
  
  /**
   * Calculate GST details from inventory and ledger entries
   */
  private calculateGstDetails(inventoryEntries: InventoryEntry[], ledgerEntries: LedgerEntry[]): GstDetail[] {
    const gstMap = new Map<string, GstDetail>();
    
    // Group by HSN code and calculate totals
    inventoryEntries.forEach((item) => {
      const hsnCode = item.hsnCode || 'No HSN';
      
      if (!gstMap.has(hsnCode)) {
        gstMap.set(hsnCode, {
          hsnCode,
          taxableValue: 0,
          cgstRate: 0,
          cgstAmount: 0,
          sgstRate: 0,
          sgstAmount: 0,
          igstRate: 0,
          igstAmount: 0,
          cessRate: 0,
          cessAmount: 0,
          totalTax: 0
        });
      }
      
      const gstDetail = gstMap.get(hsnCode)!;
      gstDetail.taxableValue += item.amount;
    });
    
    // Add tax amounts from ledger entries
    ledgerEntries.forEach((entry) => {
      const ledgerName = entry.ledgerName.toLowerCase();
      
      // Find corresponding HSN (simplified - in real scenario, we'd need better mapping)
      const hsnCode = Array.from(gstMap.keys())[0] || 'No HSN';
      const gstDetail = gstMap.get(hsnCode);
      
      if (gstDetail) {
        if (ledgerName.includes('cgst')) {
          gstDetail.cgstAmount += entry.amount;
          if (entry.gstRate) gstDetail.cgstRate = entry.gstRate;
        } else if (ledgerName.includes('sgst')) {
          gstDetail.sgstAmount += entry.amount;
          if (entry.gstRate) gstDetail.sgstRate = entry.gstRate;
        } else if (ledgerName.includes('igst')) {
          gstDetail.igstAmount += entry.amount;
          if (entry.gstRate) gstDetail.igstRate = entry.gstRate;
        } else if (ledgerName.includes('cess')) {
          gstDetail.cessAmount += entry.amount;
          if (entry.gstRate) gstDetail.cessRate = entry.gstRate;
        }
        
        gstDetail.totalTax = gstDetail.cgstAmount + gstDetail.sgstAmount + 
                            gstDetail.igstAmount + gstDetail.cessAmount;
      }
    });
    
    return Array.from(gstMap.values());
  }
  
  /**
   * Clean XML text to remove invalid characters
   */
  private cleanXmlForParsing(xmlText: string): string {
    let cleaned = xmlText;
    
    // Remove invalid character references
    cleaned = cleaned.replace(/&#([0-8]|1[1-2]|1[4-9]|2[0-9]|3[01]);/g, '');
    cleaned = cleaned.replace(/&#x[0-8A-Fa-f];/g, '');
    
    // Remove actual control characters
    // eslint-disable-next-line no-control-regex
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    
    return cleaned;
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
      return date.toLocaleDateString('en-GB');
    } catch {
      return tallyDate;
    }
  }
}

export default VoucherDetailApiService;
