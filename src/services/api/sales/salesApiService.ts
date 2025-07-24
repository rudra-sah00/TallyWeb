import BaseApiService from '../baseApiService';

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
  // Additional fields from Tally
  voucherType: string;
  voucherRetainKey: string;
  stockItems?: StockItem[];
}

export interface StockItem {
  name: string;
  rate: string;
  actualQty: string;
  billedQty: string;
  amount: number;
  hsn?: string;
}

export interface PaginatedSalesResponse {
  data: SalesVoucher[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SalesStatistics {
  totalSales: number;
  totalVouchers: number;
  averageOrderValue: number;
  topCustomers: Array<{
    name: string;
    amount: number;
    voucherCount: number;
  }>;
}

export class SalesApiService extends BaseApiService {
  
  /**
   * Fetch sales vouchers (Tax Invoice type) with pagination
   */
  async getSalesVouchers(
    fromDate: string,
    toDate: string, 
    companyName: string,
    page: number = 1,
    pageSize: number = 100,
    searchFilter?: string
  ): Promise<PaginatedSalesResponse> {
    
    // Calculate skip count for pagination
    const skip = (page - 1) * pageSize;
    
    // Prepare the XML request for Tax Invoice vouchers (Sales)
    const xmlRequest = `<ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>SalesVouchers</ID>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
            <SVFROMDATE>${fromDate}</SVFROMDATE>
            <SVTODATE>${toDate}</SVTODATE>
          </STATICVARIABLES>
          <TDL>
            <TDLMESSAGE>
              <COLLECTION NAME="SalesVouchers" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
                <TYPE>Voucher</TYPE>
                <CHILDOF>$$VchTypeTaxInvoice:$$VchTypeSales</CHILDOF>
                <FETCH>Date, VoucherTypeName, VoucherNumber, PartyLedgerName, Amount, Narration, Reference, GUID, ALTERID, VoucherRetainKey</FETCH>
                <FILTER>DateFilter</FILTER>
                ${searchFilter ? `<FILTER>PartyFilter</FILTER>` : ''}
                <SKIP>${skip}</SKIP>
                <LIMIT>${pageSize}</LIMIT>
              </COLLECTION>
              
              <SYSTEM TYPE="Formulae" NAME="DateFilter">$$VchDate &gt;= ##SVFROMDATE AND $$VchDate &lt;= ##SVTODATE</SYSTEM>
              ${searchFilter ? `<SYSTEM TYPE="Formulae" NAME="PartyFilter">$$PartyLedgerName Contains "${searchFilter}"</SYSTEM>` : ''}
            </TDLMESSAGE>
          </TDL>
        </DESC>
      </BODY>
    </ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      return this.parseSalesVouchersResponse(response, page, pageSize);
    } catch (error) {
      console.error('Error fetching sales vouchers:', error);
      throw new Error(`Failed to fetch sales data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get total count of sales vouchers for pagination
   */
  async getSalesVouchersCount(
    fromDate: string,
    toDate: string,
    companyName: string,
    searchFilter?: string
  ): Promise<number> {
    
    const xmlRequest = `<ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>SalesVouchersCount</ID>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
            <SVFROMDATE>${fromDate}</SVFROMDATE>
            <SVTODATE>${toDate}</SVTODATE>
          </STATICVARIABLES>
          <TDL>
            <TDLMESSAGE>
              <COLLECTION NAME="SalesVouchersCount" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
                <TYPE>Voucher</TYPE>
                <CHILDOF>$$VchTypeTaxInvoice:$$VchTypeSales</CHILDOF>
                <FETCH>GUID</FETCH>
                <FILTER>DateFilter</FILTER>
                ${searchFilter ? `<FILTER>PartyFilter</FILTER>` : ''}
              </COLLECTION>
              
              <SYSTEM TYPE="Formulae" NAME="DateFilter">$$VchDate &gt;= ##SVFROMDATE AND $$VchDate &lt;= ##SVTODATE</SYSTEM>
              ${searchFilter ? `<SYSTEM TYPE="Formulae" NAME="PartyFilter">$$PartyLedgerName Contains "${searchFilter}"</SYSTEM>` : ''}
            </TDLMESSAGE>
          </TDL>
        </DESC>
      </BODY>
    </ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      const doc = this.parseXML(response);
      const vouchers = doc.querySelectorAll('VOUCHER');
      return vouchers.length;
    } catch (error) {
      console.error('Error getting sales vouchers count:', error);
      return 0;
    }
  }

  /**
   * Get detailed sales voucher with stock items
   */
  async getSalesVoucherDetails(
    voucherGuid: string,
    companyName: string
  ): Promise<SalesVoucher | null> {
    
    const xmlRequest = `<ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Data</TYPE>
        <ID>VoucherDetails</ID>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
            <SVVOUCHERGUID>${voucherGuid}</SVVOUCHERGUID>
          </STATICVARIABLES>
          <TDL>
            <TDLMESSAGE>
              <VOUCHER NAME="VoucherDetails">
                <FILTER>VoucherFilter</FILTER>
                <WALKTHROUGH>AllInventoryEntries</WALKTHROUGH>
                <FETCH>Date, VoucherTypeName, VoucherNumber, PartyLedgerName, Amount, Narration, Reference, GUID, ALTERID, VoucherRetainKey</FETCH>
                <FETCH>StockItemName, Rate, ActualQty, BilledQty, Amount</FETCH>
              </VOUCHER>
              
              <SYSTEM TYPE="Formulae" NAME="VoucherFilter">$$GUID = ##SVVOUCHERGUID</SYSTEM>
            </TDLMESSAGE>
          </TDL>
        </DESC>
      </BODY>
    </ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      return this.parseSalesVoucherDetails(response);
    } catch (error) {
      console.error('Error fetching voucher details:', error);
      return null;
    }
  }

  /**
   * Get sales statistics
   */
  async getSalesStatistics(
    fromDate: string,
    toDate: string,
    companyName: string
  ): Promise<SalesStatistics> {
    
    const xmlRequest = `<ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>SalesStats</ID>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            <SVCURRENTCOMPANY>${companyName}</SVCURRENTCOMPANY>
            <SVFROMDATE>${fromDate}</SVFROMDATE>
            <SVTODATE>${toDate}</SVTODATE>
          </STATICVARIABLES>
          <TDL>
            <TDLMESSAGE>
              <COLLECTION NAME="SalesStats" ISMODIFY="No" ISFIXED="No" ISINITIALIZE="No" ISOPTION="No" ISINTERNAL="No">
                <TYPE>Voucher</TYPE>
                <CHILDOF>$$VchTypeTaxInvoice:$$VchTypeSales</CHILDOF>
                <FETCH>PartyLedgerName, Amount</FETCH>
                <FILTER>DateFilter</FILTER>
              </COLLECTION>
              
              <SYSTEM TYPE="Formulae" NAME="DateFilter">$$VchDate &gt;= ##SVFROMDATE AND $$VchDate &lt;= ##SVTODATE</SYSTEM>
            </TDLMESSAGE>
          </TDL>
        </DESC>
      </BODY>
    </ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      return this.parseSalesStatistics(response);
    } catch (error) {
      console.error('Error fetching sales statistics:', error);
      throw new Error(`Failed to fetch sales statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse sales vouchers XML response based on actual Tally structure
   */
  private parseSalesVouchersResponse(xmlText: string, page: number, pageSize: number): PaginatedSalesResponse {
    const doc = this.parseXML(xmlText);
    const vouchers = doc.querySelectorAll('VOUCHER');
    
    const data: SalesVoucher[] = [];
    
    vouchers.forEach((voucher, index) => {
      // Parse date from YYYYMMDD format
      const dateElement = voucher.querySelector('DATE');
      const dateText = dateElement?.textContent?.trim() || '';
      const formattedDate = this.formatTallyDate(dateText);
      
      // Extract basic voucher information
      const voucherNumber = voucher.querySelector('VOUCHERNUMBER')?.textContent?.trim() || '';
      const partyName = voucher.querySelector('PARTYLEDGERNAME')?.textContent?.trim() || '';
      const amountText = voucher.querySelector('AMOUNT')?.textContent?.trim() || '0';
      const amount = Math.abs(this.parseAmount(amountText)); // Take absolute value for sales
      const narration = voucher.querySelector('NARRATION')?.textContent?.trim() || '';
      const reference = voucher.querySelector('REFERENCE')?.textContent?.trim() || '';
      const guid = voucher.querySelector('GUID')?.textContent?.trim() || '';
      const alterid = voucher.querySelector('ALTERID')?.textContent?.trim() || '';
      const voucherType = voucher.querySelector('VOUCHERTYPENAME')?.textContent?.trim() || '';
      const voucherRetainKey = voucher.querySelector('VOUCHERRETAINKEY')?.textContent?.trim() || '';
      
      data.push({
        id: guid || `voucher-${page}-${index}`,
        voucherNumber,
        date: formattedDate,
        partyName,
        amount,
        narration,
        reference,
        guid,
        alterid,
        voucherType,
        voucherRetainKey
      });
    });

    return {
      data,
      totalCount: data.length < pageSize ? (page - 1) * pageSize + data.length : page * pageSize,
      page,
      pageSize,
      hasMore: data.length === pageSize
    };
  }

  /**
   * Parse detailed voucher response with stock items
   */
  private parseSalesVoucherDetails(xmlText: string): SalesVoucher | null {
    const doc = this.parseXML(xmlText);
    const voucher = doc.querySelector('VOUCHER');
    
    if (!voucher) return null;

    // Parse basic voucher info
    const dateText = voucher.querySelector('DATE')?.textContent?.trim() || '';
    const formattedDate = this.formatTallyDate(dateText);
    
    const voucherNumber = voucher.querySelector('VOUCHERNUMBER')?.textContent?.trim() || '';
    const partyName = voucher.querySelector('PARTYLEDGERNAME')?.textContent?.trim() || '';
    const amountText = voucher.querySelector('AMOUNT')?.textContent?.trim() || '0';
    const amount = Math.abs(this.parseAmount(amountText));
    const narration = voucher.querySelector('NARRATION')?.textContent?.trim() || '';
    const reference = voucher.querySelector('REFERENCE')?.textContent?.trim() || '';
    const guid = voucher.querySelector('GUID')?.textContent?.trim() || '';
    const alterid = voucher.querySelector('ALTERID')?.textContent?.trim() || '';
    const voucherType = voucher.querySelector('VOUCHERTYPENAME')?.textContent?.trim() || '';
    const voucherRetainKey = voucher.querySelector('VOUCHERRETAINKEY')?.textContent?.trim() || '';

    // Parse stock items
    const stockItems: StockItem[] = [];
    const inventoryEntries = voucher.querySelectorAll('ALLINVENTORYENTRIES STOCKITEMNAME');
    
    inventoryEntries.forEach((entry) => {
      const parentEntry = entry.parentElement;
      const name = entry.textContent?.trim() || '';
      const rate = parentEntry?.querySelector('RATE')?.textContent?.trim() || '';
      const actualQty = parentEntry?.querySelector('ACTUALQTY')?.textContent?.trim() || '';
      const billedQty = parentEntry?.querySelector('BILLEDQTY')?.textContent?.trim() || '';
      const itemAmountText = parentEntry?.querySelector('AMOUNT')?.textContent?.trim() || '0';
      const itemAmount = Math.abs(this.parseAmount(itemAmountText));
      const hsn = parentEntry?.querySelector('GSTHSNNAME')?.textContent?.trim() || '';

      if (name) {
        stockItems.push({
          name,
          rate,
          actualQty,
          billedQty,
          amount: itemAmount,
          hsn
        });
      }
    });

    return {
      id: guid,
      voucherNumber,
      date: formattedDate,
      partyName,
      amount,
      narration,
      reference,
      guid,
      alterid,
      voucherType,
      voucherRetainKey,
      stockItems
    };
  }

  /**
   * Parse sales statistics from XML response
   */
  private parseSalesStatistics(xmlText: string): SalesStatistics {
    const doc = this.parseXML(xmlText);
    const vouchers = doc.querySelectorAll('VOUCHER');
    
    let totalSales = 0;
    const customerSales = new Map<string, { amount: number; count: number }>();

    vouchers.forEach(voucher => {
      const amountText = voucher.querySelector('AMOUNT')?.textContent?.trim() || '0';
      const amount = Math.abs(this.parseAmount(amountText));
      const partyName = voucher.querySelector('PARTYLEDGERNAME')?.textContent?.trim() || 'Unknown';

      totalSales += amount;

      // Track customer-wise sales
      const existing = customerSales.get(partyName) || { amount: 0, count: 0 };
      customerSales.set(partyName, {
        amount: existing.amount + amount,
        count: existing.count + 1
      });
    });

    // Get top customers
    const topCustomers = Array.from(customerSales.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        voucherCount: data.count
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    return {
      totalSales,
      totalVouchers: vouchers.length,
      averageOrderValue: vouchers.length > 0 ? totalSales / vouchers.length : 0,
      topCustomers
    };
  }

  /**
   * Get top customers by sales amount
   */
  async getTopCustomers(
    fromDate: string,
    toDate: string,
    companyName: string,
    limit: number = 10
  ): Promise<Array<{ name: string; amount: number; voucherCount: number }>> {
    try {
      // Get statistics which includes top customers
      const stats = await this.getSalesStatistics(fromDate, toDate, companyName);
      return stats.topCustomers.slice(0, limit);
    } catch (error) {
      console.error('Error fetching top customers:', error);
      return [];
    }
  }

  /**
   * Format Tally date (YYYYMMDD) to readable format
   */
  private formatTallyDate(tallyDate: string): string {
    if (!tallyDate || tallyDate.length !== 8) return '';
    
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

export default SalesApiService;
