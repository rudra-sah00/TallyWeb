// Company Management API Service

import BaseApiService from '../baseApiService';

export interface TallyCompany {
  name: string;
  startFrom: string;
  endTo: string;
}

export interface TallyCompanyTaxDetails {
  name: string;
  incometaxnumber: string;
  booksfrom: string;
}

export interface TallyCompanyDetails {
  name: string;
  guid: string;
  email: string;
  address: string[];
  phone: string;
  pincode: string;
  countryName: string;
  stateName: string;
  booksFrom: string;
  mailingName: string[];
}

export default class CompanyApiService extends BaseApiService {
  
  async getCompanyList(): Promise<TallyCompany[]> {
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>List of Companies</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="List of Companies" ISMODIFY="No">
            <TYPE>Company</TYPE>
            <FETCH>NAME</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const xmlText = await this.makeRequest(xmlRequest);
      console.log('Company List XML Response:', xmlText);
      
      const xmlDoc = this.parseXML(xmlText);
      const companies: TallyCompany[] = [];
      
      // Parse company names from XML
      const companyElements = xmlDoc.querySelectorAll('COMPANY');
      companyElements.forEach(company => {
        const name = company.querySelector('NAME')?.textContent?.trim();
        const startFrom = company.querySelector('STARTFROM')?.textContent?.trim() || '';
        const endTo = company.querySelector('ENDTO')?.textContent?.trim() || '';
        
        if (name) {
          companies.push({
            name,
            startFrom,
            endTo
          });
        }
      });

      // If no companies found with above structure, try alternative parsing
      if (companies.length === 0) {
        const nameElements = xmlDoc.querySelectorAll('NAME');
        nameElements.forEach(nameElement => {
          const name = nameElement.textContent?.trim();
          if (name && !name.startsWith('$$')) { // Filter out system names
            companies.push({
              name,
              startFrom: '',
              endTo: ''
            });
          }
        });
      }

      console.log('Parsed Companies:', companies);
      return companies;
    } catch (error) {
      console.error('Failed to fetch company list:', error);
      throw error;
    }
  }

  async getCompanyDetails(companyName: string): Promise<TallyCompanyDetails | null> {
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>OBJECT</TYPE>
    <SUBTYPE>Company</SUBTYPE>
    <ID TYPE="Name">${companyName}</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <FETCHLIST>
        <FETCH>Name</FETCH>
        <FETCH>GUID</FETCH>
        <FETCH>MAILINGNAME.LIST</FETCH>
        <FETCH>ADDRESS.LIST</FETCH>
        <FETCH>PHONE</FETCH>
        <FETCH>EMAIL</FETCH>
        <FETCH>COUNTRYNAME</FETCH>
        <FETCH>STATENAME</FETCH>
        <FETCH>PINCODE</FETCH>
        <FETCH>BOOKSFROM</FETCH>
        <FETCH>PARTYGSTIN</FETCH>
        <FETCH>PAN</FETCH>
      </FETCHLIST>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      console.log('Company Details XML Response:', response);
      const xmlDoc = this.parseXML(response);
      
      // Updated parsing logic to match the actual XML structure
      const companyElement = xmlDoc.querySelector('TALLYMESSAGE COMPANY') || xmlDoc.querySelector('COMPANY');
      if (!companyElement) {
        console.log('No COMPANY element found in XML');
        return null;
      }

      const getElementText = (elementName: string): string => {
        const element = companyElement.querySelector(elementName);
        return element?.textContent?.trim() || '';
      };

      // Parse the address list properly
      const addressElements = companyElement.querySelectorAll('ADDRESS\\.LIST ADDRESS');
      const addresses: string[] = [];
      addressElements.forEach(addr => {
        const text = addr.textContent?.trim();
        if (text) addresses.push(text);
      });

      // Parse mailing names if available
      const mailingElements = companyElement.querySelectorAll('MAILINGNAME\\.LIST MAILINGNAME');
      const mailingNames: string[] = [];
      mailingElements.forEach(name => {
        const text = name.textContent?.trim();
        if (text) mailingNames.push(text);
      });

      const companyDetails = {
        name: getElementText('NAME'),
        guid: getElementText('GUID'),
        email: getElementText('EMAIL'),
        phone: getElementText('PHONE'),
        address: addresses,
        pincode: getElementText('PINCODE'),
        countryName: getElementText('COUNTRYNAME'),
        stateName: getElementText('STATENAME'),
        booksFrom: getElementText('BOOKSFROM'),
        mailingName: mailingNames
      };

      console.log('Parsed Company Details:', companyDetails);
      return companyDetails;
    } catch (error) {
      console.error('Failed to fetch company details:', error);
      throw error;
    }
  }

  async getCompanyTaxDetails(): Promise<TallyCompanyTaxDetails | null> {
    const xmlRequest = `
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>EXPORT</TALLYREQUEST>
    <TYPE>COLLECTION</TYPE>
    <ID>CompanyDetails</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="CompanyDetails" ISINITIALIZE="Yes">
            <TYPE>Company</TYPE>
            <FETCH>NAME,INCOMETAXNUMBER,BOOKSFROM</FETCH>
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      console.log('Company Tax Details XML Response:', response);
      const xmlDoc = this.parseXML(response);
      
      // Updated parsing logic to match the actual XML structure
      const companyElement = xmlDoc.querySelector('DATA COLLECTION COMPANY') || 
                            xmlDoc.querySelector('TALLYMESSAGE COMPANY') || 
                            xmlDoc.querySelector('COMPANY');
      
      if (!companyElement) {
        console.log('No COMPANY element found in Tax XML');
        return null;
      }

      const getElementText = (elementName: string): string => {
        const element = companyElement.querySelector(elementName);
        const value = element?.textContent?.trim() || '';
        console.log(`Tax - ${elementName}: ${value}`);
        return value;
      };

      const taxDetails = {
        name: getElementText('NAME'),
        incometaxnumber: getElementText('INCOMETAXNUMBER'),
        booksfrom: getElementText('BOOKSFROM')
      };

      console.log('Parsed Tax Details:', taxDetails);
      return taxDetails;
    } catch (error) {
      console.error('Failed to fetch company tax details:', error);
      throw error;
    }
  }
}
