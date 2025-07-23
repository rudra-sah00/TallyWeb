// Base Tally API Service for common functionality
import AppConfigService from '../config/appConfig';

export default class BaseApiService {
  protected baseURL: string | null;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    
    if (this.isDevelopment) {
      // In development, always use proxy endpoint
      this.baseURL = '/api/tally';
    } else {
      // Production mode, use user configuration
      const config = AppConfigService.getInstance();
      this.baseURL = config.getServerUrl();
    }
  }

  setBaseURL(url: string): void {
    if (this.isDevelopment) {
      // In development, always use proxy endpoint
      this.baseURL = '/api/tally';
    } else {
      // Production mode, use direct URL
      this.baseURL = url;
    }
  }

  protected async makeRequest(xmlRequest: string): Promise<string> {
    try {
      if (!this.baseURL) {
        throw new Error('Server configuration not available. Please configure server settings first.');
      }
      
      console.log('Making request to:', this.baseURL);
      
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

      // Check if we should use the Vite proxy instead of direct connection
      let requestUrl = this.baseURL;
      if (this.baseURL.startsWith('http://192.168.1.2:9000')) {
        // Use the Vite proxy to avoid CORS issues
        requestUrl = '/api/tally';
        console.log('Using Vite proxy:', requestUrl);
      } else if (this.baseURL.startsWith('http://') && !this.baseURL.includes('/api/tally')) {
        // For other external servers, add mode: 'cors'
        requestOptions.mode = 'cors';
        console.log('Using CORS mode for direct request');
      }

      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout after 5 seconds. Please check if Tally server is running and accessible.'));
        }, 5000);
      });

      // Race between fetch and timeout
      const response = await Promise.race([
        fetch(requestUrl, requestOptions),
        timeoutPromise
      ]);

      if (!response.ok) {
        throw new Error(`Tally API error: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Tally API request failed:', error);
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(`CORS Error: Failed to connect to server ${this.baseURL}. 

This is likely a CORS (Cross-Origin Resource Sharing) issue. External servers like ${this.baseURL} need to allow browser requests.

Solutions:
1. Enable CORS on your Tally server
2. Use a proxy server
3. Run from the same network/domain
4. Check if Tally Gateway allows browser requests

Technical note: curl works but browser doesn't due to CORS security policy.`);
      }
      
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new Error(`Connection timeout to ${this.baseURL}. The server may be:\n1. Not responding within 5 seconds\n2. Network latency issues\n3. Blocked by firewall\n4. Server overloaded`);
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
