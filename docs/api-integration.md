# API Integration Guide

This guide explains how to integrate the financial dashboard with external APIs, particularly Tally XML API.

## Current Architecture

The application currently uses dummy data through the `DashboardContext`. To integrate with real APIs:

1. Replace dummy data generators with API calls
2. Add error handling and loading states
3. Implement data caching strategies
4. Add real-time updates where needed

## Tally XML API Integration

### Overview
Tally provides XML-based API for data extraction and manipulation. The integration involves:
- Connecting to Tally server
- Sending XML requests
- Parsing XML responses
- Converting to application data format

### Connection Setup
```typescript
// src/services/tallyApi.ts
class TallyApiService {
  private baseUrl: string;
  private port: number;

  constructor(host: string = 'localhost', port: number = 9000) {
    this.baseUrl = `http://${host}`;
    this.port = port;
  }

  async sendRequest(xmlRequest: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}:${this.port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
      },
      body: xmlRequest,
    });

    if (!response.ok) {
      throw new Error(`Tally API error: ${response.statusText}`);
    }

    return await response.text();
  }
}
```

### Data Extraction Examples

#### Sales Data
```xml
<!-- Get sales data -->
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Sales Register</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>XML</SVEXPORTFORMAT>
          <SVFROMDATE>01-Apr-2024</SVFROMDATE>
          <SVTODATE>31-Mar-2025</SVTODATE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>
```

#### Purchase Data
```xml
<!-- Get purchase data -->
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Purchase Register</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>XML</SVEXPORTFORMAT>
          <SVFROMDATE>01-Apr-2024</SVFROMDATE>
          <SVTODATE>31-Mar-2025</SVTODATE>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>
```

#### Stock Summary
```xml
<!-- Get stock summary -->
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Stock Summary</REPORTNAME>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>XML</SVEXPORTFORMAT>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>
```

## Data Service Layer

### Base Service
```typescript
// src/services/baseService.ts
export abstract class BaseService {
  protected async handleApiCall<T>(
    apiCall: () => Promise<T>
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }
}
```

### Sales Service
```typescript
// src/services/salesService.ts
export class SalesService extends BaseService {
  private tallyApi: TallyApiService;

  constructor(tallyApi: TallyApiService) {
    super();
    this.tallyApi = tallyApi;
  }

  async getSalesData(): Promise<SalesData> {
    return this.handleApiCall(async () => {
      const xmlRequest = this.buildSalesRequest();
      const xmlResponse = await this.tallyApi.sendRequest(xmlRequest);
      return this.parseSalesResponse(xmlResponse);
    });
  }

  private buildSalesRequest(): string {
    // Build XML request for sales data
  }

  private parseSalesResponse(xmlResponse: string): SalesData {
    // Parse XML response and convert to SalesData format
  }
}
```

## Context Integration

### Updated Dashboard Context
```typescript
// src/context/DashboardContext.tsx
export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const salesService = new SalesService(new TallyApiService());
  const purchaseService = new PurchaseService(new TallyApiService());
  const inventoryService = new InventoryService(new TallyApiService());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [salesData, purchaseData, inventoryData] = await Promise.all([
          salesService.getSalesData(),
          purchaseService.getPurchaseData(),
          inventoryService.getInventoryData(),
        ]);

        setData({
          sales: salesData,
          purchases: purchaseData,
          inventory: inventoryData,
          // ... other data
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <DashboardContext.Provider value={{ data, loading, error }}>
      {children}
    </DashboardContext.Provider>
  );
};
```

## Error Handling

### Error Types
```typescript
// src/types/errors.ts
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TALLY_CONNECTION_ERROR = 'TALLY_CONNECTION_ERROR',
  DATA_PARSING_ERROR = 'DATA_PARSING_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
}

export interface ApiError {
  type: ErrorType;
  message: string;
  details?: any;
}
```

### Error Boundary
```typescript
// src/components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Caching Strategy

### Local Storage Cache
```typescript
// src/utils/cache.ts
export class CacheService {
  private static instance: CacheService;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;

  private constructor() {
    this.cache = new Map();
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  set(key: string, data: any, ttl: number = 300000): void { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }
}
```

## Real-time Updates

### WebSocket Integration
```typescript
// src/services/websocketService.ts
export class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect(url: string): void {
    this.ws = new WebSocket(url);
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.notifyListeners(data.type, data.payload);
    };
  }

  subscribe(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  private notifyListeners(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }
}
```

## Configuration

### Environment Variables
```env
# .env
REACT_APP_TALLY_HOST=localhost
REACT_APP_TALLY_PORT=9000
REACT_APP_API_BASE_URL=http://localhost:3001
REACT_APP_WEBSOCKET_URL=ws://localhost:3002
```

### Configuration Service
```typescript
// src/config/index.ts
export const config = {
  tally: {
    host: process.env.REACT_APP_TALLY_HOST || 'localhost',
    port: parseInt(process.env.REACT_APP_TALLY_PORT || '9000'),
  },
  api: {
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001',
  },
  websocket: {
    url: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3002',
  },
};
```

## Testing API Integration

### Mock Services
```typescript
// src/services/__mocks__/tallyApiService.ts
export class MockTallyApiService {
  async sendRequest(xmlRequest: string): Promise<string> {
    // Return mock XML response based on request
    return mockXmlResponse;
  }
}
```

### Integration Tests
```typescript
// src/services/__tests__/salesService.test.ts
describe('SalesService', () => {
  it('should fetch and parse sales data correctly', async () => {
    const mockTallyApi = new MockTallyApiService();
    const salesService = new SalesService(mockTallyApi);
    
    const salesData = await salesService.getSalesData();
    
    expect(salesData).toBeDefined();
    expect(salesData.totalSales).toBeGreaterThan(0);
  });
});
```

## Migration Steps

1. **Phase 1**: Replace dummy data with API calls
2. **Phase 2**: Add error handling and loading states
3. **Phase 3**: Implement caching and optimization
4. **Phase 4**: Add real-time updates
5. **Phase 5**: Performance monitoring and optimization

## Best Practices

- Always handle API errors gracefully
- Implement proper loading states
- Cache frequently accessed data
- Use TypeScript for type safety
- Write comprehensive tests
- Monitor API performance
- Implement retry mechanisms
- Use environment-specific configurations