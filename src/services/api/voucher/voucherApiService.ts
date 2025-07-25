import BaseApiService from '../baseApiService';

export interface VoucherTransaction {
  date: string;
  voucherType: string;
  voucherNumber: string;
  partyName: string;
  amount: number;
  ledgerEntries: LedgerEntry[];
  inventoryEntries: InventoryEntry[];
}

export interface LedgerEntry {
  ledgerName: string;
  amount: number;
  narration?: string;
}

export interface InventoryEntry {
  stockName: string;
  quantity: number;
  rate: number;
  amount: number;
  unit?: string;
}

export interface VoucherFilters {
  fromDate: string; // YYYYMMDD format
  toDate: string;   // YYYYMMDD format
  ledgerName: string;
}

export default class VoucherApiService extends BaseApiService {
  /**
   * Get voucher transactions for a specific ledger within date range
   * If fromDate and toDate are empty, fetches all available transactions
   */
  async getVoucherTransactions(
    companyName: string,
    ledgerName: string,
    fromDate: string,
    toDate: string
  ): Promise<VoucherTransaction[]> {
    // Build static variables conditionally
    let staticVarsXml = `
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>`;
    
    // Only add date filters if both dates are provided
    if (fromDate && toDate) {
      staticVarsXml += `
        <SVFROMDATE TYPE="Date">${fromDate}</SVFROMDATE>
        <SVTODATE TYPE="Date">${toDate}</SVTODATE>`;
    }

    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Day Book</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>${staticVarsXml}
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      
      if (response.includes('Unknown Request') || response.includes('LINEERROR')) {
        console.warn('Tally server error in response:', response);
        throw new Error('Invalid request format or ledger not found');
      }
      
      const allTransactions = this.parseVoucherTransactions(response);
      
      // Filter transactions by ledger name if specified
      let filteredTransactions = allTransactions;
      if (ledgerName && ledgerName.trim() !== '') {
        filteredTransactions = allTransactions.filter(transaction => {
          // Check if the ledger appears in inventory entries (stock items)
          const hasInventoryMatch = transaction.inventoryEntries.some(entry => 
            entry.stockName.toLowerCase().includes(ledgerName.toLowerCase()) ||
            ledgerName.toLowerCase().includes(entry.stockName.toLowerCase())
          );
          
          // Check if the ledger appears in ledger entries
          const hasLedgerMatch = transaction.ledgerEntries.some(entry => 
            entry.ledgerName.toLowerCase().includes(ledgerName.toLowerCase()) ||
            ledgerName.toLowerCase().includes(entry.ledgerName.toLowerCase())
          );
          
          // Check if the ledger matches the party name
          const hasPartyMatch = transaction.partyName.toLowerCase().includes(ledgerName.toLowerCase()) ||
                                ledgerName.toLowerCase().includes(transaction.partyName.toLowerCase());
          
          return hasInventoryMatch || hasLedgerMatch || hasPartyMatch;
        });
      }
      
      return filteredTransactions;
    } catch (error) {
      console.error('Failed to fetch voucher transactions:', error);
      throw error;
    }
  }

  /**
   * Parse voucher transactions XML response
   */
  private parseVoucherTransactions(xmlText: string): VoucherTransaction[] {
    const doc = this.parseXML(xmlText);
    const transactions: VoucherTransaction[] = [];

    // Find all VOUCHER elements
    const voucherNodes = doc.querySelectorAll('VOUCHER');
    
    voucherNodes.forEach(voucherNode => {
      try {
        // Extract voucher-level data
        const date = this.getElementText(voucherNode, 'DATE');
        const voucherType = this.getElementText(voucherNode, 'VOUCHERTYPENAME');
        const voucherNumber = this.getElementText(voucherNode, 'VOUCHERNUMBER');
        const partyName = this.getElementText(voucherNode, 'PARTYLEDGERNAME') || 
                          this.getElementText(voucherNode, 'PARTYNAME');

        // Extract ledger entries
        const ledgerEntries: LedgerEntry[] = [];
        const ledgerEntryNodes = voucherNode.querySelectorAll('LEDGERENTRIES\\.LIST');
        
        ledgerEntryNodes.forEach(entryNode => {
          const ledgerName = this.getElementText(entryNode, 'LEDGERNAME');
          const amountText = this.getElementText(entryNode, 'AMOUNT');
          const narration = this.getElementText(entryNode, 'NARRATION');
          
          if (ledgerName && amountText) {
            ledgerEntries.push({
              ledgerName,
              amount: this.parseAmount(amountText),
              narration: narration || undefined
            });
          }
        });

        // Extract inventory entries separately
        const inventoryEntries: InventoryEntry[] = [];
        const inventoryNodes = voucherNode.querySelectorAll('ALLINVENTORYENTRIES\\.LIST');
        
        inventoryNodes.forEach(invNode => {
          const stockName = this.getElementText(invNode, 'STOCKITEMNAME');
          const amountText = this.getElementText(invNode, 'AMOUNT');
          const quantity = this.getElementText(invNode, 'BILLEDQTY') || this.getElementText(invNode, 'ACTUALQTY');
          const rate = this.getElementText(invNode, 'RATE');
          const unit = this.getElementText(invNode, 'BASEUNIT') || this.getElementText(invNode, 'UOM');
          
          if (stockName && amountText) {
            const amount = this.parseAmount(amountText);
            const qty = parseFloat(quantity || '0');
            const rateValue = this.parseAmount(rate || '0');
            
            inventoryEntries.push({
              stockName,
              quantity: qty,
              rate: rateValue,
              amount: Math.abs(amount), // Always show positive amounts for inventory
              unit: unit || undefined
            });
          }
        });

        // Calculate total amount - look for the party ledger amount (should be negative for sales)
        let totalAmount = 0;
        const partyEntry = ledgerEntries.find(entry => 
          entry.ledgerName === partyName || 
          (partyName && entry.ledgerName.toLowerCase().includes(partyName.toLowerCase()))
        );
        
        if (partyEntry) {
          // For sales transactions, party amount is negative, so we take absolute value
          totalAmount = Math.abs(partyEntry.amount);
        } else {
          // Fallback: sum of inventory amounts or positive ledger amounts
          const inventoryTotal = inventoryEntries.reduce((sum, entry) => sum + entry.amount, 0);
          
          if (inventoryTotal > 0) {
            totalAmount = inventoryTotal;
          } else {
            totalAmount = ledgerEntries
              .filter(entry => entry.amount > 0)
              .reduce((sum, entry) => sum + entry.amount, 0);
          }
        }

        if (date && voucherType && voucherNumber && (ledgerEntries.length > 0 || inventoryEntries.length > 0)) {
          transactions.push({
            date: this.formatDate(date),
            voucherType,
            voucherNumber,
            partyName: partyName || 'Unknown',
            amount: totalAmount,
            ledgerEntries,
            inventoryEntries
          });
        }
      } catch (error) {
        console.warn('Error parsing voucher node:', error);
      }
    });

    // Sort by date (newest first)
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Helper method to get text content from an element
   */
  private getElementText(parentNode: Element, tagName: string): string {
    const element = parentNode.querySelector(tagName);
    return element?.textContent?.trim() || '';
  }

  /**
   * Format date from YYYYMMDD to readable format
   */
  private formatDate(dateStr: string): string {
    if (dateStr.length === 8) {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  }

  /**
   * Convert date from DD/MM/YYYY to YYYYMMDD format for Tally API
   */
  static formatDateForTally(dateStr: string): string {
    const [day, month, year] = dateStr.split('/');
    return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
  }

  /**
   * Get current month date range in Tally format
   */
  static getCurrentMonthRange(): { fromDate: string; toDate: string } {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const lastDay = new Date(year, month, 0).getDate();

    return {
      fromDate: `${year}${month.toString().padStart(2, '0')}01`,
      toDate: `${year}${month.toString().padStart(2, '0')}${lastDay.toString().padStart(2, '0')}`
    };
  }
}
