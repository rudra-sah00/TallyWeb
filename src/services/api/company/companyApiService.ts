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
  pan?: string;
  gstin?: string;
  contactPerson?: string;
  contactNumber?: string;
  bankNames?: string[];
  tradeName?: string;
  formalName?: string;
  mobileNumbers?: string[];
  faxNumber?: string;
  website?: string;
  adminEmail?: string;
  companyChequeName?: string;
  gstRegistrationType?: string;
  typeOfSupply?: string;
  smsName?: string;
  vattinNumber?: string;
  interstateStNumber?: string;
  authorisedPerson?: string;
  authorisedPersonDesignation?: string;
  udfFields?: Record<string, string | string[]>;
  chequeBankDetails?: Array<Record<string, string>>;
  [key: string]: any;
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
        <FETCH>*</FETCH>
      </FETCHLIST>
    </DESC>
  </BODY>
</ENVELOPE>`;

    try {
      const response = await this.makeRequest(xmlRequest);
      // Debug: log the raw XML response
      if (typeof window !== 'undefined') {
        console.log('RAW COMPANY XML:', response);
      } else {
        // eslint-disable-next-line no-console
        console.log('RAW COMPANY XML:', response);
      }
      const xmlDoc = this.parseXML(response);
      const companyElement = xmlDoc.querySelector('TALLYMESSAGE COMPANY') || xmlDoc.querySelector('COMPANY');
      if (!companyElement) return null;
      // Helper to convert XML tag to lowerCamelCase
      const toCamel = (str: string) => {
        // Remove dots, underscores, hyphens, and convert to lowerCamelCase
        return str
          .toLowerCase()
          .replace(/[-_\.]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
          .replace(/^([a-z])/, (m) => m.toLowerCase());
      };
      // Helper to parse .LIST as array
      const parseList = (node: Element) => Array.from(node.children).map(child => child.textContent?.trim() || '').filter(Boolean);
      // Helper to parse .LIST of objects
      const parseListOfObjects = (node: Element) => Array.from(node.children).map(child => {
        const obj: Record<string, string> = {};
        Array.from(child.children).forEach(grandchild => {
          obj[toCamel(grandchild.nodeName)] = grandchild.textContent?.trim() || '';
        });
        return obj;
      });
      // Parse all direct children
      const details: Record<string, any> = {};
      Array.from(companyElement.children).forEach(child => {
        const key = toCamel(child.nodeName);
        if (child.nodeName.endsWith('.LIST')) {
          // If children are objects, parse as array of objects
          if (Array.from(child.children).some(grandchild => grandchild.children.length > 0)) {
            details[key] = parseListOfObjects(child);
          } else {
            details[key] = parseList(child);
          }
        } else {
          details[key] = child.textContent?.trim() || '';
        }
      });
      // --- Enhancement: Map Tally XML fields to expected UI fields robustly ---
      // Address
      if (companyElement.querySelector('ADDRESS.LIST')) {
        details.address = Array.from(companyElement.querySelectorAll('ADDRESS.LIST > ADDRESS')).map(e => e.textContent?.trim() || '').filter(Boolean);
      } else {
        details.address = details['address'] || details['addressList'] || details['address.lIST'] || details['address.LIST'] || details['ADDRESS.LIST'] || [];
        if (!Array.isArray(details.address)) details.address = [details.address].filter(Boolean);
      }
      // Mailing Name
      if (companyElement.querySelector('MAILINGNAME')) {
        details.mailingName = Array.from(companyElement.querySelectorAll('MAILINGNAME')).map(e => e.textContent?.trim() || '').filter(Boolean);
      } else {
        details.mailingName = details['mailingName'] || details['mailingNameList'] || details['mailingname'] || details['mailingnameList'] || details['mailingname.lIST'] || details['mailingname.LIST'] || details['MAILINGNAME'] || [];
        if (!Array.isArray(details.mailingName)) details.mailingName = [details.mailingName].filter(Boolean);
      }
      // Bank Names
      details.bankNames = details['companychequebanksList'] ? details['companychequebanksList'].map((b: any) => b.companychequebanks).filter(Boolean) : [];
      // Mobile Numbers
      if (companyElement.querySelector('MOBILENUMBERS.LIST')) {
        details.mobileNumbers = Array.from(companyElement.querySelectorAll('MOBILENUMBERS.LIST > MOBILENUMBERS')).map(e => e.textContent?.trim() || '').filter(Boolean);
      } else {
        details.mobileNumbers = details['mobilenumbers'] || details['mobilenumbersList'] || details['mobilenumbers.lIST'] || details['mobilenumbers.LIST'] || details['MOBILENUMBERS.LIST'] || [];
        if (!Array.isArray(details.mobileNumbers)) details.mobileNumbers = [details.mobileNumbers].filter(Boolean);
      }
      // Name
      details.name = details['name'] || companyElement.getAttribute('NAME') || '';
      // Formal Name
      details.formalName = details['basiccompanyformalname'] || details['formalName'] || details['BASICCOMPANYFORMALNAME'] || '';
      // Trade Name
      details.tradeName = details['cmptradename'] || details['tradeName'] || details['CMPTRADENAME'] || '';
      // Admin Email
      details.adminEmail = details['adminemailid'] || details['adminEmail'] || details['ADMINEMAILID'] || '';
      // Company Cheque Name
      details.companyChequeName = details['companychequename'] || details['companyChequeName'] || details['COMPANYCHEQUENAME'] || '';
      // GST Registration Type
      details.gstRegistrationType = details['gstregistrationtype'] || details['gstRegistrationType'] || details['GSTREGISTRATIONTYPE'] || '';
      // Type of Supply
      details.typeOfSupply = details['cmptypeofsupply'] || details['typeOfSupply'] || details['CMPTYPEOFSUPPLY'] || '';
      // PAN
      details.pan = details['incometaxnumber'] || details['pan'] || details['INCOMETAXNUMBER'] || '';
      // GSTIN - try multiple sources including LOGINIDENTIFIER from TPLOGININFO.LIST
      let gstin = details['gstregistrationnumber'] || 
                  details['gstin'] || 
                  details['GSTREGISTRATIONNUMBER'] || '';
      
      // If not found, look for LOGINIDENTIFIER in TPLOGININFO.LIST
      if (!gstin) {
        // Try different selector variations for TPLOGININFO.LIST
        const tploginList = companyElement.querySelector('TPLOGININFO\\.LIST') || 
                           companyElement.querySelector('TPLOGININFO.LIST') ||
                           companyElement.querySelector('tplogininfo\\.list') ||
                           companyElement.querySelector('tplogininfo.list');
        if (tploginList) {
          const loginIdentifier = tploginList.querySelector('LOGINIDENTIFIER') ||
                                  tploginList.querySelector('loginidentifier');
          if (loginIdentifier) {
            gstin = loginIdentifier.textContent?.trim() || '';
            console.log('Found GSTIN from LOGINIDENTIFIER:', gstin);
          }
        } else {
          console.log('TPLOGININFO.LIST not found, trying global search...');
          // Try a global search for LOGINIDENTIFIER
          const loginIdentifier = companyElement.querySelector('LOGINIDENTIFIER') ||
                                  companyElement.querySelector('loginidentifier');
          if (loginIdentifier) {
            gstin = loginIdentifier.textContent?.trim() || '';
            console.log('Found GSTIN from global LOGINIDENTIFIER search:', gstin);
          }
        }
      }
      
      details.gstin = gstin;
      // Also store as loginidentifier for PDF generator compatibility
      details.loginidentifier = gstin;
      // Contact Person
      details.contactPerson = details['companycontactperson'] || details['contactPerson'] || details['COMPANYCONTACTPERSON'] || '';
      // Contact Number
      details.contactNumber = details['companycontactnumber'] || details['contactNumber'] || details['COMPANYCONTACTNUMBER'] || '';
      // SMS Name
      details.smsName = details['companysmsname'] || details['smsName'] || details['COMPANYSMSNAME'] || '';
      // VAT TIN
      details.vattinNumber = details['vattinnumber'] || details['vattinNumber'] || details['VATTINNUMBER'] || '';
      // Interstate ST Number
      details.interstateStNumber = details['interstatestnumber'] || details['interstateStNumber'] || details['INTERSTATESTNUMBER'] || '';
      // Authorised Person
      details.authorisedPerson = details['cmpauthpersnname'] || details['authorisedPerson'] || details['CMPAUTHPERSNNAME'] || '';
      // Authorised Person Designation
      details.authorisedPersonDesignation = details['cmpauthpersndesgnation'] || details['authorisedPersonDesignation'] || details['CMPAUTHPERSNDESGNATION'] || '';
      // Books From
      details.booksFrom = details['booksfrom'] || details['booksFrom'] || details['BOOKSFROM'] || '';
      // State Name
      details.stateName = details['statename'] || details['stateName'] || details['priorstatename'] || details['STATENAME'] || '';
      // Country Name
      details.countryName = details['countryname'] || details['countryName'] || details['COUNTRYNAME'] || '';
      // Pincode
      details.pincode = details['pincode'] || details['PINCODE'] || '';
      // Email
      details.email = details['email'] || details['EMAIL'] || '';
      // Phone
      details.phone = details['phonenumber'] || details['phone'] || '';
      // Fax Number
      details.faxNumber = details['faxnumber'] || details['CMPFAXNUMBER'] || '';
      // Website
      details.website = details['website'] || '';
      // UDF Fields (custom fields)
      details.udfFields = Object.fromEntries(Object.entries(details).filter(([k]) => k.startsWith('udf')));
      // Debug: log the parsed details object
      if (typeof window !== 'undefined') {
        console.log('DEBUG: Parsed company details', details);
      } else {
        // eslint-disable-next-line no-console
        console.log('DEBUG: Parsed company details', details);
      }
      return details as TallyCompanyDetails;
    } catch (error) {
      console.error('Failed to fetch company details:', error);
      throw error;
    }
  }

  async getCompanyTaxDetails(companyName?: string): Promise<TallyCompanyTaxDetails | null> {
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
        ${companyName ? `<SVCurrentCompany>${companyName}</SVCurrentCompany>` : ''}
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
      const xmlDoc = this.parseXML(response);
      
      // Updated parsing logic to match the actual XML structure
      const companyElement = xmlDoc.querySelector('DATA COLLECTION COMPANY') || 
                            xmlDoc.querySelector('TALLYMESSAGE COMPANY') || 
                            xmlDoc.querySelector('COMPANY');
      
      if (!companyElement) {
        return null;
      }

      const getElementText = (elementName: string): string => {
        const element = companyElement.querySelector(elementName);
        const value = element?.textContent?.trim() || '';
        return value;
      };

      const taxDetails = {
        name: getElementText('NAME'),
        incometaxnumber: getElementText('INCOMETAXNUMBER'),
        booksfrom: getElementText('BOOKSFROM')
      };

      return taxDetails;
    } catch (error) {
      console.error('Failed to fetch company tax details:', error);
      throw error;
    }
  }
}
