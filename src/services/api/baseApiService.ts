// Base Tally API Service for common functionality
import AppConfigService from '../config/appConfig';

export default class BaseApiService {
  protected baseURL: string | null;
  private isDevelopment: boolean;
  private static requestQueue: Promise<any> = Promise.resolve();

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    
    if (this.isDevelopment) {
      // In development, always use proxy endpoint to avoid CORS
      this.baseURL = '/api/tally';
    } else {
      // Production mode, use user configuration
      const config = AppConfigService.getInstance();
      this.baseURL = config.getServerUrl();
    }
  }

  setBaseURL(url: string): void {
    if (this.isDevelopment) {
      // In development, always use proxy endpoint to avoid CORS
      this.baseURL = '/api/tally';
    } else {
      // Production mode, use direct URL
      this.baseURL = url;
    }
  }

  protected async makeRequest(xmlRequest: string): Promise<string> {
    // Queue requests to prevent simultaneous calls to Tally server
    return BaseApiService.requestQueue = BaseApiService.requestQueue.then(async () => {
      return this.executeRequest(xmlRequest);
    }).catch(async () => {
      // If previous request failed, still execute this one
      return this.executeRequest(xmlRequest);
    });
  }

  private async executeRequest(xmlRequest: string): Promise<string> {
    try {
      if (!this.baseURL) {
        throw new Error('Server configuration not available. Please configure server settings first.');
      }
      
      const requestOptions: RequestInit = {
        method: 'POST',
        headers: { 
          'Content-Type': 'text/xml',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store',
        body: xmlRequest,
      };

      // Use the configured base URL (proxy in dev, direct in prod)
      let requestUrl = this.baseURL;
      
      if (this.isDevelopment) {
        // In development, we're using the Vite proxy
      } else {
        // For production direct connections, use CORS mode
        if (this.baseURL.startsWith('http://')) {
          requestOptions.mode = 'cors';
        }
      }

      // Create a timeout promise with reasonable timeout for Tally API
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout after 45 seconds. Please check if Tally server is running and accessible.'));
        }, 45000); // Set to 45 seconds - slightly more than curl time
      });

      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(requestUrl, requestOptions),
        timeoutPromise
      ]);

      if (!response.ok) {
        const responseText = await response.text();
        
        // Check for specific Tally errors
        if (responseText.includes("Could not set 'SVCurrentCompany'")) {
          const companyMatch = responseText.match(/'([^']+)'/);
          const companyName = companyMatch ? companyMatch[1] : 'Unknown';
          throw new Error(`Company "${companyName}" does not exist in Tally. Please check if:\n1. The company is created in Tally\n2. The company name is spelled correctly\n3. The company is currently open in Tally\n\nNote: Use "M/S. SAHOO SANITARY (2025-26)" - this is the available company in Tally.`);
        }
        
        throw new Error(`Tally API error: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      
      // Check for Tally errors in the response body
      if (responseText.includes("Could not set 'SVCurrentCompany'")) {
        const companyMatch = responseText.match(/'([^']+)'/);
        const companyName = companyMatch ? companyMatch[1] : 'Unknown';
        throw new Error(`Company "${companyName}" does not exist in Tally. Please check if:\n1. The company is created in Tally\n2. The company name is spelled correctly\n3. The company is currently open in Tally\n\nNote: Use "M/S. SAHOO SANITARY (2025-26)" - this is the available company in Tally.`);
      }

      return responseText;
    } catch (error) {
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(`Connection Error: Unable to connect to Tally server at ${this.baseURL}

Possible causes:
1. Tally server is not running or accessible
2. Network connectivity issues
3. Firewall blocking the connection
4. Server IP address has changed
5. Port 9000 is blocked

Current configuration: ${this.baseURL}

Please verify:
- Tally Gateway is running on the target server
- The server IP address is correct
- Port 9000 is accessible from your network
- No firewall is blocking the connection`);
      }
      
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error(`Connection timeout to ${this.baseURL}. The server may be:\n1. Not responding within 45 seconds\n2. Processing large datasets (this is normal for Tally)\n3. Multiple simultaneous requests overloading server\n4. Network latency issues\n5. Blocked by firewall\n\nTally API typically takes 30+ seconds for large data requests.`);
      }
      
      throw error;
    }
  }

  protected parseXML(xmlText: string): Document {
    const parser = new DOMParser();
    return parser.parseFromString(xmlText, 'text/xml');
  }

  protected parseAmount(amountText: string): number {
    if (!amountText || amountText.trim() === '') {
      return 0;
    }
    
    // Clean the amount text - remove spaces and non-numeric characters except decimal point and negative sign
    const cleanText = amountText.trim().replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleanText);
    
    return isNaN(parsed) ? 0 : parsed;
  }
}
