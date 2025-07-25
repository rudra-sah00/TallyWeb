// Balance Sheet API Service
import BaseApiService from './baseApiService';

export interface BalanceSheetItem {
  name: string;
  subAmount: number;
  mainAmount: number;
  type: 'liability' | 'asset';
}

export interface BalanceSheetData {
  liabilities: BalanceSheetItem[];
  assets: BalanceSheetItem[];
  totalLiabilities: number;
  totalAssets: number;
  netWorth: number;
}

/**
 * Balance Sheet API Service
 * 
 * IMPORTANT: Tally's Balance Sheet XML Data Format:
 * - Assets typically appear as NEGATIVE values in the XML (e.g., Fixed Assets: -4870474.38)
 * - Liabilities typically appear as POSITIVE values in the XML (e.g., Loans: 2014719.60)
 * 
 * However, in accounting presentations:
 * - Both Assets and Liabilities should be displayed as POSITIVE amounts
 * - Net Worth = Total Assets - Total Liabilities
 * 
 * This service handles the conversion from Tally's XML format to standard accounting presentation.
 */
export class BalanceSheetApiService extends BaseApiService {
  
  async getBalanceSheet(fromDate: string = '20240401', toDate: string = '20250722', companyName?: string): Promise<BalanceSheetData> {
    // Add timestamp to ensure unique requests
    const timestamp = Date.now();
    
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Balance Sheet</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVFROMDATE>${fromDate}</SVFROMDATE>
        <SVTODATE>${toDate}</SVTODATE>
        <EXPLODEFLAG>Yes</EXPLODEFLAG>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        ${companyName ? `<SVCurrentCompany>${companyName}</SVCurrentCompany>` : ''}
        <RequestID>${timestamp}</RequestID>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const xmlText = await this.makeRequest(xmlRequest);
      
      const xmlDoc = this.parseXML(xmlText);
      const balanceSheetData = this.parseBalanceSheetXML(xmlDoc);
      
      return balanceSheetData;
    } catch (error) {
      console.error('Failed to fetch balance sheet:', error);
      throw error;
    }
  }

  private parseBalanceSheetXML(xmlDoc: Document): BalanceSheetData {
    const liabilities: BalanceSheetItem[] = [];
    const assets: BalanceSheetItem[] = [];
    
    // Parse all BSNAME and BSAMT pairs
    const bsNameElements = xmlDoc.querySelectorAll('BSNAME');
    const bsAmtElements = xmlDoc.querySelectorAll('BSAMT');
    
    for (let i = 0; i < bsNameElements.length && i < bsAmtElements.length; i++) {
      const nameElement = bsNameElements[i];
      const amtElement = bsAmtElements[i];
      
      const displayName = nameElement.querySelector('DSPACCNAME DSPDISPNAME')?.textContent?.trim();
      const subAmountText = amtElement.querySelector('BSSUBAMT')?.textContent?.trim();
      const mainAmountText = amtElement.querySelector('BSMAINAMT')?.textContent?.trim();
      
      if (!displayName) continue;
      
      const subAmount = this.parseAmount(subAmountText || '');
      const mainAmount = this.parseAmount(mainAmountText || '');
      
      // Skip if both amounts are zero
      if (subAmount === 0 && mainAmount === 0) continue;
      
      const item: BalanceSheetItem = {
        name: displayName,
        subAmount,
        mainAmount,
        type: this.determineItemType(displayName, subAmount, mainAmount)
      };
      
      if (item.type === 'liability') {
        liabilities.push(item);
      } else {
        assets.push(item);
      }
    }
    
    // Calculate totals correctly for financial statements
    // Assets in Tally often show as negative, but should be positive in balance sheet
    const totalAssets = assets.reduce((sum, item) => {
      const amount = item.mainAmount !== 0 ? item.mainAmount : item.subAmount;
      return sum + Math.abs(amount); // Always positive for assets
    }, 0);
    
    // Liabilities should be positive
    const totalLiabilities = liabilities.reduce((sum, item) => {
      const amount = item.mainAmount !== 0 ? item.mainAmount : item.subAmount;
      return sum + Math.abs(amount); // Always positive for liabilities
    }, 0);
    
    // Net Worth = Assets - Liabilities (Owner's Equity)
    const netWorth = totalAssets - totalLiabilities;
    
    return {
      liabilities,
      assets,
      totalLiabilities,
      totalAssets,
      netWorth
    };
  }
  
  private determineItemType(name: string, subAmount: number, mainAmount: number): 'asset' | 'liability' {
    const displayName = name.toLowerCase();
    
    // Comprehensive liability keywords (these are what you owe)
    const liabilityKeywords = [
      'loan', 'liability', 'creditor', 'payable', 'bank od', 'overdraft',
      'duty', 'tax', 'provision', 'reserve', 'capital', 'retained earnings',
      'surplus', 'outstanding', 'accrued', 'payroll', 'salary', 'wages',
      'interest payable', 'dividend payable', 'bills payable', 'notes payable',
      'current liability', 'long term liability', 'secured loan', 'unsecured loan'
    ];
    
    // Comprehensive asset keywords (these are what you own)
    const assetKeywords = [
      'asset', 'cash', 'bank', 'stock', 'inventory', 'receivable', 'debtor',
      'investment', 'equipment', 'machinery', 'building', 'land', 'vehicle',
      'furniture', 'computer', 'current asset', 'fixed asset', 'tangible asset',
      'intangible asset', 'prepaid', 'advance', 'deposits', 'bills receivable',
      'notes receivable', 'marketable securities', 'short term investment',
      'goodwill', 'patent', 'trademark', 'copyright'
    ];
    
    // Check for liability keywords first
    for (const keyword of liabilityKeywords) {
      if (displayName.includes(keyword)) {
        return 'liability';
      }
    }
    
    // Check for asset keywords
    for (const keyword of assetKeywords) {
      if (displayName.includes(keyword)) {
        return 'asset';
      }
    }
    
    // Special cases based on common accounting patterns
    if (displayName.includes('closing') && displayName.includes('stock')) {
      return 'asset';
    }
    
    if (displayName.includes('opening') && displayName.includes('stock')) {
      return 'asset';
    }
    
    if (displayName.includes('sundry') && displayName.includes('creditor')) {
      return 'liability';
    }
    
    if (displayName.includes('sundry') && displayName.includes('debtor')) {
      return 'asset';
    }
    
    // Default fallback: In Tally's XML format, negative amounts are typically assets
    // and positive amounts are typically liabilities, but we now classify by name primarily
    const amount = mainAmount !== 0 ? mainAmount : subAmount;
    
    // If we can't determine by name, use the sign as last resort
    // But this is less reliable than name-based classification
    return amount < 0 ? 'asset' : 'liability';
  }
}

export const balanceSheetApiService = new BalanceSheetApiService();
