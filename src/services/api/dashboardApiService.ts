// Dashboard API Service for financial overview

import BaseApiService from './baseApiService';

export interface FinancialOverview {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;
  netProfit: number;
  gstPayable: number;
  cashBank: number;
}

export default class DashboardApiService extends BaseApiService {

  // Get Cash Balance
  async getCashBalance(company: string): Promise<number> {
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>Object</TYPE>
    <ID>Ledg.Cash</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <FETCHLIST>
        <FETCH>Name</FETCH>
        <FETCH>ClosingBalance</FETCH>
      </FETCHLIST>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const xmlText = await this.makeRequest(xmlRequest);
      
      const xmlDoc = this.parseXML(xmlText);
      const closingBalance = xmlDoc.querySelector('CLOSINGBALANCE')?.textContent || '0';
      return this.parseAmount(closingBalance);
    } catch (error) {
      console.error('Failed to fetch cash balance:', error);
      return 0;
    }
  }

  // Get Bank Balance
  async getBankBalance(company: string): Promise<number> {
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>Object</TYPE>
    <ID>Ledg.Bank</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <FETCHLIST>
        <FETCH>Name</FETCH>
        <FETCH>ClosingBalance</FETCH>
      </FETCHLIST>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const xmlText = await this.makeRequest(xmlRequest);
      
      const xmlDoc = this.parseXML(xmlText);
      const closingBalance = xmlDoc.querySelector('CLOSINGBALANCE')?.textContent || '0';
      return this.parseAmount(closingBalance);
    } catch (error) {
      console.error('Failed to fetch bank balance:', error);
      return 0;
    }
  }

  // Get Sales Vouchers
  async getSalesVouchers(fromDate: string, toDate: string, company: string): Promise<number> {
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>Voucher Register</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVFROMDATE TYPE="Date">${fromDate}</SVFROMDATE>
        <SVTODATE TYPE="Date">${toDate}</SVTODATE>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="SalesVocs">
            <TYPE>Voucher</TYPE>
            <FILTERS>OnlySales</FILTERS>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="OnlySales">
            $VoucherType = "Sales"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const xmlText = await this.makeRequest(xmlRequest);
      
      const xmlDoc = this.parseXML(xmlText);
      let totalSales = 0;
      
      const amounts = xmlDoc.querySelectorAll('AMOUNT');
      amounts.forEach(amount => {
        const value = this.parseAmount(amount.textContent || '0');
        if (value > 0) totalSales += value;
      });
      
      return totalSales;
    } catch (error) {
      console.error('Failed to fetch sales vouchers:', error);
      return 0;
    }
  }

  // Get Purchase Vouchers
  async getPurchaseVouchers(fromDate: string, toDate: string, company: string): Promise<number> {
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>Voucher Register</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVFROMDATE TYPE="Date">${fromDate}</SVFROMDATE>
        <SVTODATE TYPE="Date">${toDate}</SVTODATE>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="PurchaseVocs">
            <TYPE>Voucher</TYPE>
            <FILTERS>OnlyPurchase</FILTERS>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="OnlyPurchase">
            $VoucherType = "Purchase"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const xmlText = await this.makeRequest(xmlRequest);
      
      const xmlDoc = this.parseXML(xmlText);
      let totalPurchases = 0;
      
      const amounts = xmlDoc.querySelectorAll('AMOUNT');
      amounts.forEach(amount => {
        const value = this.parseAmount(amount.textContent || '0');
        if (value > 0) totalPurchases += value;
      });
      
      return totalPurchases;
    } catch (error) {
      console.error('Failed to fetch purchase vouchers:', error);
      return 0;
    }
  }

  // Get Expense Vouchers (Payment and Journal)
  async getExpenseVouchers(fromDate: string, toDate: string, company: string): Promise<number> {
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>Voucher Register</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVFROMDATE TYPE="Date">${fromDate}</SVFROMDATE>
        <SVTODATE TYPE="Date">${toDate}</SVTODATE>
        <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="ExpenseVocs">
            <TYPE>Voucher</TYPE>
            <FILTERS>OnlyExpenses</FILTERS>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="OnlyExpenses">
            $VoucherType = "Payment" OR $VoucherType = "Journal"
          </SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const xmlText = await this.makeRequest(xmlRequest);
      
      const xmlDoc = this.parseXML(xmlText);
      let totalExpenses = 0;
      
      const amounts = xmlDoc.querySelectorAll('AMOUNT');
      amounts.forEach(amount => {
        const value = this.parseAmount(amount.textContent || '0');
        if (value > 0) totalExpenses += value;
      });
      
      return totalExpenses;
    } catch (error) {
      console.error('Failed to fetch expense vouchers:', error);
      return 0;
    }
  }

  // Get comprehensive financial overview using all APIs
  async getFinancialOverview(fromDate: string, toDate: string, company: string): Promise<FinancialOverview> {
    try {
      
      // Fetch all data in parallel
      const [cashBalance, bankBalance, totalSales, totalPurchases, totalExpenses] = await Promise.all([
        this.getCashBalance(company),
        this.getBankBalance(company),
        this.getSalesVouchers(fromDate, toDate, company),
        this.getPurchaseVouchers(fromDate, toDate, company),
        this.getExpenseVouchers(fromDate, toDate, company)
      ]);

      const cashBank = cashBalance + bankBalance;
      const netProfit = totalSales - totalPurchases - totalExpenses;
      const gstPayable = totalSales * 0.18; // Assuming 18% GST

      const overview: FinancialOverview = {
        totalSales,
        totalPurchases,
        totalExpenses,
        netProfit,
        gstPayable,
        cashBank
      };

      return overview;
    } catch (error) {
      console.error('Failed to fetch financial overview:', error);
      throw error;
    }
  }
}
