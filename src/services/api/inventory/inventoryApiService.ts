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
  totalCount: number;
  hasMore: boolean;
  currentPage: number;
  pageSize: number;
}

export interface StockItemsParams {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  forceRefresh?: boolean;
  companyName: string; // Make required - no fallback
}

class InventoryApiService extends BaseApiService {
  private xmlParser = new DOMParser();

  async getStockItems(params: StockItemsParams): Promise<StockItemsResponse> {
    const { 
      page = 1, 
      pageSize = 50, 
      searchTerm = '', 
      forceRefresh = false,
      companyName
    } = params;
    
    if (!companyName) {
      throw new Error('No company selected. Please select a company first.');
    }
    
    const cacheKey = `stockItems_${page}_${pageSize}_${searchTerm}`;
    
    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cachedData = cacheService.get<StockItemsResponse>(cacheKey);
      if (cachedData) {
        return cachedData;
      }
    }

    // Calculate skip count for pagination
    const skipCount = (page - 1) * pageSize;

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
              <SVCurrentCompany>${companyName}</SVCurrentCompany>
            </STATICVARIABLES>
            <TDL>
              <TDLMESSAGE>
                <COLLECTION NAME="StockItem" MAXLINES="${pageSize}" SKIP="${skipCount}">
                  <TYPE>StockItem</TYPE>
                  <FETCH>NAME</FETCH>
                  <FETCH>BASEUNITS</FETCH>
                  <FETCH>OPENINGBALANCE</FETCH>
                  <FETCH>OPENINGVALUE</FETCH>
                  <FETCH>CLOSINGBALANCE</FETCH>
                  <FETCH>CLOSINGVALUE</FETCH>
                  <FETCH>STANDARDCOST</FETCH>
                  <FETCH>STANDARDPRICE</FETCH>
                  <SCROLLED>Yes</SCROLLED>
                  ${searchTerm ? `<FILTER>StockItemFilter</FILTER>` : ''}
                </COLLECTION>
                ${searchTerm ? `
                <SYSTEM TYPE="Formulae" NAME="StockItemFilter">
                  $$StringFind:$Name:"${searchTerm}":1 > 0
                </SYSTEM>
                ` : ''}
              </TDLMESSAGE>
            </TDL>
          </DESC>
        </BODY>
      </ENVELOPE>
    `;

    try {
      const responseData = await this.makeRequest(xmlPayload);
      const result = this.parseStockItemsResponse(responseData, page, pageSize, searchTerm);
      
      // Cache the result for 5 minutes (shorter cache for paginated data)
      cacheService.set(cacheKey, result, 5 * 60 * 1000);
      
      return result;
    } catch (error) {
      console.error('Error fetching stock items:', error);
      throw new Error('Failed to fetch stock items');
    }
  }

  // Method to get total count of stock items (for pagination)
  async getTotalStockItemsCount(searchTerm = '', companyName?: string): Promise<number> {
    if (!companyName) {
      throw new Error('No company selected. Please select a company first.');
    }
    
    const cacheKey = `stockItemsCount_${searchTerm}_${companyName}`;
    
    const cachedCount = cacheService.get<number>(cacheKey);
    if (cachedCount !== null) {
      return cachedCount;
    }

    const xmlPayload = `
      <ENVELOPE>
        <HEADER>
          <VERSION>1</VERSION>
          <TALLYREQUEST>Export</TALLYREQUEST>
          <TYPE>Collection</TYPE>
          <ID>StockItemCount</ID>
        </HEADER>
        <BODY>
          <DESC>
            <STATICVARIABLES>
              <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
              <SVCurrentCompany>${companyName}</SVCurrentCompany>
            </STATICVARIABLES>
            <TDL>
              <TDLMESSAGE>
                <COLLECTION NAME="StockItemCount">
                  <TYPE>StockItem</TYPE>
                  <FETCH>NAME</FETCH>
                  ${searchTerm ? `<FILTER>StockItemFilter</FILTER>` : ''}
                </COLLECTION>
                ${searchTerm ? `
                <SYSTEM TYPE="Formulae" NAME="StockItemFilter">
                  $$StringFind:$Name:"${searchTerm}":1 > 0
                </SYSTEM>
                ` : ''}
              </TDLMESSAGE>
            </TDL>
          </DESC>
        </BODY>
      </ENVELOPE>
    `;

    try {
      const responseData = await this.makeRequest(xmlPayload);
      const xmlDoc = this.xmlParser.parseFromString(responseData, 'text/xml');
      const stockItems = xmlDoc.querySelectorAll('STOCKITEM');
      const count = stockItems.length;
      
      // Cache count for 10 minutes
      cacheService.set(cacheKey, count, 10 * 60 * 1000);
      
      return count;
    } catch (error) {
      console.error('Error fetching stock items count:', error);
      return 0;
    }
  }

  private parseStockItemsResponse(
    xmlData: string, 
    page: number, 
    pageSize: number, 
    _searchTerm: string // Prefix with underscore to indicate intentionally unused
  ): StockItemsResponse {
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

      // For now, we'll estimate totalCount. In a real implementation, 
      // you might need a separate API call to get the exact count
      const hasMore = items.length === pageSize;
      const estimatedTotalCount = hasMore ? (page * pageSize) + 1 : (page - 1) * pageSize + items.length;

      return { 
        items,
        totalCount: estimatedTotalCount,
        hasMore,
        currentPage: page,
        pageSize
      };
    } catch (error) {
      console.error('❌ Error parsing stock items XML:', error);
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
