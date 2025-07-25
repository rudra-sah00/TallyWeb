import BaseApiService from '../baseApiService';

export interface BasicVoucherDetail {
  voucherNumber: string;
  date: string;
  partyName: string;
  amount: number;
  voucherType: string;
  reference: string;
  narration: string;
  guid: string;
  // We'll populate these from the existing XML response we already have
  items: VoucherItem[];
}

export interface VoucherItem {
  stockItemName: string;
  quantity: string;
  rate: string;
  amount: number;
  hsnCode?: string;
  gstRate?: string;
}

export class BasicVoucherService extends BaseApiService {
  
  /**
   * Get voucher details from the current sales response
   * This uses the data we already fetch to avoid making complex queries
   */
  getVoucherDetailsFromCache(voucherGuid: string, salesResponseXml: string): BasicVoucherDetail | null {
    try {
      
      // Clean XML to remove invalid characters
      const cleanedXml = this.cleanXmlForParsing(salesResponseXml);
      const doc = this.parseXML(cleanedXml);
      
      // Find the specific voucher by GUID
      const vouchers = doc.querySelectorAll('VOUCHER');
      let targetVoucher: Element | null = null;
      
      for (const voucher of vouchers) {
        const guid = voucher.querySelector('GUID')?.textContent;
        if (guid === voucherGuid) {
          targetVoucher = voucher;
          break;
        }
      }
      
      if (!targetVoucher) {
        return null;
      }
      
      // Extract basic voucher information
      const voucherNumber = targetVoucher.querySelector('VOUCHERNUMBER')?.textContent || '';
      const date = targetVoucher.querySelector('DATE')?.textContent || '';
      const partyName = targetVoucher.querySelector('PARTYLEDGERNAME')?.textContent || '';
      const amount = Math.abs(parseFloat(targetVoucher.querySelector('AMOUNT')?.textContent || '0'));
      const voucherType = targetVoucher.querySelector('VOUCHERTYPENAME')?.textContent || '';
      const reference = targetVoucher.querySelector('REFERENCE')?.textContent || '';
      const narration = targetVoucher.querySelector('NARRATION')?.textContent || '';
      
      // Extract inventory items from the cached XML
      const items = this.extractInventoryItems(targetVoucher);
      
      const voucherDetail: BasicVoucherDetail = {
        voucherNumber,
        date: this.formatTallyDate(date),
        partyName: partyName.trim(),
        amount,
        voucherType,
        reference,
        narration,
        guid: voucherGuid,
        items
      };
      
      return voucherDetail;
      
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Extract inventory items from a voucher element
   */
  private extractInventoryItems(voucher: Element): VoucherItem[] {
    const items: VoucherItem[] = [];
    
    try {
      const inventoryEntries = voucher.querySelectorAll('ALLINVENTORYENTRIES\\.LIST');
      
      inventoryEntries.forEach((entry) => {
        const stockItemName = entry.querySelector('STOCKITEMNAME')?.textContent || '';
        const actualQty = entry.querySelector('ACTUALQTY')?.textContent || '';
        const billedQty = entry.querySelector('BILLEDQTY')?.textContent || '';
        const rate = entry.querySelector('RATE')?.textContent || '';
        const amount = Math.abs(parseFloat(entry.querySelector('AMOUNT')?.textContent || '0'));
        const hsnCode = entry.querySelector('GSTHSNNAME')?.textContent || '';
        
        if (stockItemName) {
          items.push({
            stockItemName,
            quantity: billedQty || actualQty,
            rate,
            amount,
            hsnCode: hsnCode || undefined
          });
        }
      });
      
    } catch (error) {
      console.warn('Warning: Could not extract inventory items:', error);
    }
    
    return items;
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

export default BasicVoucherService;
