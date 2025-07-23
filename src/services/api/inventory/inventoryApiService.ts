import BaseApiService from '../baseApiService';
import { cacheService } from '../../cacheService';

export interface StockItem {
  name: string;
  baseUnits: string;
  closingBalance: string;
  openingBalance: string;
  closingValue: string;
  openingValue: string;
  standardCost: string;
  standardPrice: string;
  languageName?: string;
  reservedName?: string;
}

export interface StockItemsResponse {
  items: StockItem[];
}

class InventoryApiService extends BaseApiService {
  private xmlParser = new DOMParser();

  async getStockItems(forceRefresh = false): Promise<StockItemsResponse> {
    const cacheKey = 'stockItems';
    
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cachedData = cacheService.get<StockItemsResponse>(cacheKey);
      if (cachedData) {
        console.log('Returning cached stock items');
        return cachedData;
      }
    }

    const xmlPayload = `
      <ENVELOPE>
        <HEADER>
          <VERSION>1</VERSION>
          <TALLYREQUEST>Export</TALLYREQUEST>
          <TYPE>Collection</TYPE>
          <ID>StockItem</ID>
        </HEADER>
        <BODY>
          <DESC>
            <STATICVARIABLES>
              <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
              <SVCurrentCompany>M/S. SAHOO SANITARY (2025-26)</SVCurrentCompany>
            </STATICVARIABLES>
            <TDL>
              <TDLMESSAGE>
                <COLLECTION NAME="StockItem">
                  <TYPE>StockItem</TYPE>
                  <FETCH>NAME</FETCH>
                  <FETCH>BASEUNITS</FETCH>
                  <FETCH>OPENINGBALANCE</FETCH>
                  <FETCH>OPENINGVALUE</FETCH>
                  <FETCH>CLOSINGBALANCE</FETCH>
                  <FETCH>CLOSINGVALUE</FETCH>
                  <FETCH>STANDARDCOST</FETCH>
                  <FETCH>STANDARDPRICE</FETCH>
                </COLLECTION>
              </TDLMESSAGE>
            </TDL>
          </DESC>
        </BODY>
      </ENVELOPE>
    `;

    try {
      console.log('Fetching fresh stock items from API');
      const responseData = await this.makeRequest(xmlPayload);
      const result = this.parseStockItemsResponse(responseData);
      
      // Cache the result for 10 minutes
      cacheService.set(cacheKey, result, 10 * 60 * 1000);
      
      return result;
    } catch (error) {
      console.error('Error fetching stock items:', error);
      throw new Error('Failed to fetch stock items');
    }
  }

  private parseStockItemsResponse(xmlData: string): StockItemsResponse {
    try {
      const xmlDoc = this.xmlParser.parseFromString(xmlData, 'text/xml');
      const stockItems = xmlDoc.querySelectorAll('STOCKITEM');
      
      const items: StockItem[] = Array.from(stockItems).map(item => {
        const name = item.getAttribute('NAME') || '';
        const reservedName = item.getAttribute('RESERVEDNAME') || '';
        
        // Extract data from child elements
        const baseUnits = item.querySelector('BASEUNITS')?.textContent || '';
        const closingBalance = item.querySelector('CLOSINGBALANCE')?.textContent || '';
        const openingBalance = item.querySelector('OPENINGBALANCE')?.textContent || '';
        const closingValue = item.querySelector('CLOSINGVALUE')?.textContent || '';
        const openingValue = item.querySelector('OPENINGVALUE')?.textContent || '';
        const standardCost = item.querySelector('STANDARDCOST')?.textContent || '';
        const standardPrice = item.querySelector('STANDARDPRICE')?.textContent || '';
        
        // Extract language name
        const languageNameList = item.querySelector('LANGUAGENAME\\.LIST');
        const languageName = languageNameList?.querySelector('NAME\\.LIST n')?.textContent || '';
        
        return {
          name: name.trim(),
          reservedName: reservedName.trim() || undefined,
          baseUnits: baseUnits.trim(),
          closingBalance: closingBalance.trim(),
          openingBalance: openingBalance.trim(),
          closingValue: closingValue.trim(),
          openingValue: openingValue.trim(),
          standardCost: standardCost.trim(),
          standardPrice: standardPrice.trim(),
          languageName: languageName.trim() || undefined
        };
      }).filter(item => item.name); // Filter out empty names

      return { items };
    } catch (error) {
      console.error('Error parsing stock items XML:', error);
      throw new Error('Failed to parse stock items data');
    }
  }

  // Helper method to format date for Tally API (YYYYMMDD)
  formatDateForTally(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }
}

export const inventoryApiService = new InventoryApiService();
