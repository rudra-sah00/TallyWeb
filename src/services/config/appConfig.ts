/**
 * Application configuration service
 * Manages server settings and user preferences
 */

export interface AppConfig {
  serverAddress?: string;
  serverPort?: number;
  currentCompany?: string;
  connectionTimeout?: number;
}

export interface CompanyInfo {
  name: string;
  guid: string;
  email: string;
  address: string[];
  pincode: string;
  country: string;
  state: string;
  booksFrom: string;
  phone?: string;
  pan?: string;
  gstin?: string;
}

class AppConfigService {
  private static instance: AppConfigService;
  private config: AppConfig | null;

  private constructor() {
    // Load config from localStorage - no defaults
    this.config = this.loadConfig();
  }

  public static getInstance(): AppConfigService {
    if (!AppConfigService.instance) {
      AppConfigService.instance = new AppConfigService();
    }
    return AppConfigService.instance;
  }

  private loadConfig(): AppConfig | null {
    const savedConfig = localStorage.getItem('appConfig');
    
    if (savedConfig) {
      try {
        return JSON.parse(savedConfig);
      } catch (error) {
        console.warn('Failed to parse saved config:', error);
        localStorage.removeItem('appConfig'); // Remove corrupted config
        return null;
      }
    }

    return null;
  }

  public getConfig(): AppConfig | null {
    if (!this.config) {
      return null;
    }
    return { ...this.config };
  }

  public updateConfig(updates: Partial<AppConfig>): void {
    if (!this.config) {
      this.config = { ...updates };
    } else {
      this.config = { ...this.config, ...updates };
    }
    this.saveConfig();
  }

  public getServerUrl(): string | null {
    if (!this.config?.serverAddress || !this.config?.serverPort) {
      return null;
    }
    return `http://${this.config.serverAddress}:${this.config.serverPort}`;
  }

  public getCurrentCompany(): string | null {
    return this.config?.currentCompany || null;
  }

  public setCurrentCompany(companyName: string): void {
    if (!this.config) {
      this.config = { currentCompany: companyName };
    } else {
      this.config.currentCompany = companyName;
    }
    this.saveConfig();
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('appConfig', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  // Reset to defaults
  public resetConfig(): void {
    localStorage.removeItem('appConfig');
    this.config = this.loadConfig();
  }
}

export default AppConfigService;
