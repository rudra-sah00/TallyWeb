# Customization Guide

This guide explains how to customize and extend the financial dashboard application.

## Theme Customization

### Color System
The application uses a consistent color system defined in Tailwind CSS. To customize colors:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        // Add custom colors here
      }
    }
  }
}
```

### Typography
Customize fonts and text styles:

```css
/* src/index.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

body {
  font-family: 'Inter', sans-serif;
}

.heading-xl {
  @apply text-3xl font-bold text-gray-900;
}

.heading-lg {
  @apply text-2xl font-semibold text-gray-800;
}
```

## Component Customization

### Adding New Dashboard Cards
Create custom overview cards:

```typescript
// src/modules/dashboard/components/CustomCard.tsx
interface CustomCardProps {
  title: string;
  value: number;
  icon: React.ComponentType;
  color: string;
}

const CustomCard: React.FC<CustomCardProps> = ({ title, value, icon, color }) => {
  const Icon = icon;
  
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className={`p-3 rounded-lg bg-${color}-50 border-${color}-200 text-${color}-700`}>
        <Icon size={24} />
      </div>
      <h3 className="text-gray-600 text-sm font-medium mt-4">{title}</h3>
      <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
};
```

### Extending Module Functionality
Add new tabs to existing modules:

```typescript
// src/modules/sales/SalesModule.tsx
<Tabs defaultValue="overview" className="w-full">
  <TabsList className="grid w-full grid-cols-5"> {/* Updated grid */}
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
    <TabsTrigger value="customers">Customers</TabsTrigger>
    <TabsTrigger value="transactions">Transactions</TabsTrigger>
    <TabsTrigger value="reports">Reports</TabsTrigger> {/* New tab */}
  </TabsList>
  
  {/* Add new tab content */}
  <TabsContent value="reports" className="space-y-6">
    <SalesReports />
  </TabsContent>
</Tabs>
```

## Data Customization

### Adding New Metrics
Extend the data structure:

```typescript
// src/utils/dummyData.ts
export const generateDummyData = () => {
  return {
    overview: {
      // Existing metrics
      totalSales: 45750000,
      totalPurchases: 32400000,
      // New custom metrics
      customerSatisfaction: 4.8,
      marketShare: 12.5,
      profitMargin: 18.2,
    },
    // Add new data sections
    customMetrics: {
      kpi1: 95.5,
      kpi2: 87.3,
      kpi3: 76.8,
    }
  };
};
```

### Custom Data Formatters
Create specialized formatting functions:

```typescript
// src/shared/utils/formatters.ts
export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatRating = (value: number): string => {
  return `${value.toFixed(1)}/5.0`;
};

export const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
};
```

## Chart Customization

### Custom Chart Types
Add new chart configurations:

```typescript
// src/shared/components/CustomChart.tsx
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface CustomChartProps {
  data: any;
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar';
  options?: any;
}

const CustomChart: React.FC<CustomChartProps> = ({ data, type, options }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstance.current = new Chart(ctx, {
          type,
          data,
          options: {
            responsive: true,
            maintainAspectRatio: false,
            ...options,
          },
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, type, options]);

  return <canvas ref={chartRef}></canvas>;
};
```

### Chart Themes
Create consistent chart styling:

```typescript
// src/shared/utils/chartThemes.ts
export const chartThemes = {
  default: {
    backgroundColor: [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 163, 74, 0.8)',
      'rgba(217, 119, 6, 0.8)',
      'rgba(220, 38, 38, 0.8)',
      'rgba(147, 51, 234, 0.8)',
    ],
    borderColor: [
      'rgb(59, 130, 246)',
      'rgb(16, 163, 74)',
      'rgb(217, 119, 6)',
      'rgb(220, 38, 38)',
      'rgb(147, 51, 234)',
    ],
  },
  monochrome: {
    backgroundColor: [
      'rgba(75, 85, 99, 0.8)',
      'rgba(107, 114, 128, 0.8)',
      'rgba(156, 163, 175, 0.8)',
      'rgba(209, 213, 219, 0.8)',
    ],
  },
};
```

## Layout Customization

### Custom Grid Layouts
Create responsive grid systems:

```typescript
// src/shared/components/GridLayout.tsx
interface GridLayoutProps {
  columns: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  gap: number;
  children: React.ReactNode;
}

const GridLayout: React.FC<GridLayoutProps> = ({ columns, gap, children }) => {
  const gridClasses = `
    grid 
    grid-cols-${columns.sm} 
    md:grid-cols-${columns.md} 
    lg:grid-cols-${columns.lg} 
    xl:grid-cols-${columns.xl} 
    gap-${gap}
  `;

  return <div className={gridClasses}>{children}</div>;
};
```

### Custom Sidebar
Modify the sidebar navigation:

```typescript
// src/shared/components/CustomSidebar.tsx
const customMenuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, badge: null },
  { id: 'sales', label: 'Sales', icon: ShoppingCart, badge: '12' },
  { id: 'purchases', label: 'Purchases', icon: Package, badge: null },
  { id: 'inventory', label: 'Inventory', icon: Package, badge: '5' },
  // Add custom menu items
  { id: 'reports', label: 'Reports', icon: FileText, badge: null },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, badge: 'New' },
];
```

## Form Customization

### Custom Form Components
Create reusable form elements:

```typescript
// src/shared/components/FormComponents.tsx
interface InputProps {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

const Input: React.FC<InputProps> = ({ 
  label, 
  type, 
  value, 
  onChange, 
  error, 
  required 
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};
```

## Adding New Modules

### Module Structure
Create a new module following the established pattern:

```
src/modules/reports/
├── ReportsModule.tsx
├── components/
│   ├── ReportOverview.tsx
│   ├── ReportBuilder.tsx
│   ├── ReportHistory.tsx
│   └── ReportExport.tsx
└── types/
    └── reports.ts
```

### Module Implementation
```typescript
// src/modules/reports/ReportsModule.tsx
const ReportsModule: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Reports</h1>
        <p className="text-gray-600 mt-2">Generate and manage financial reports</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="builder">Report Builder</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <ReportOverview />
        </TabsContent>
        
        <TabsContent value="builder">
          <ReportBuilder />
        </TabsContent>
        
        <TabsContent value="history">
          <ReportHistory />
        </TabsContent>
        
        <TabsContent value="export">
          <ReportExport />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

### Register New Module
Add to main App.tsx:

```typescript
// src/App.tsx
import ReportsModule from './modules/reports/ReportsModule';

const renderCurrentView = () => {
  switch (currentView) {
    case 'dashboard':
      return <Dashboard />;
    case 'sales':
      return <SalesModule />;
    case 'purchases':
      return <PurchasesModule />;
    case 'inventory':
      return <InventoryModule />;
    case 'reports': // New module
      return <ReportsModule />;
    default:
      return <Dashboard />;
  }
};
```

## Responsive Design

### Breakpoint Customization
Modify responsive breakpoints:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
      // Custom breakpoints
      'tablet': '640px',
      'laptop': '1024px',
      'desktop': '1280px',
    }
  }
}
```

### Mobile-First Components
Create mobile-optimized components:

```typescript
// src/shared/components/ResponsiveCard.tsx
const ResponsiveCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="
      bg-white rounded-lg p-4 shadow-sm border border-gray-200
      sm:p-6 sm:rounded-xl
      lg:hover:shadow-md lg:transition-shadow
    ">
      {children}
    </div>
  );
};
```

## Performance Optimization

### Lazy Loading
Implement lazy loading for modules:

```typescript
// src/App.tsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./modules/dashboard/Dashboard'));
const SalesModule = lazy(() => import('./modules/sales/SalesModule'));
const PurchasesModule = lazy(() => import('./modules/purchases/PurchasesModule'));
const InventoryModule = lazy(() => import('./modules/inventory/InventoryModule'));

const renderCurrentView = () => {
  const Component = getComponent(currentView);
  
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Component />
    </Suspense>
  );
};
```

### Memoization
Optimize component rendering:

```typescript
// src/modules/dashboard/components/OverviewCards.tsx
import { memo } from 'react';

const OverviewCards = memo(() => {
  // Component implementation
});

export default OverviewCards;
```

## Deployment Customization

### Environment Configuration
Create environment-specific configurations:

```typescript
// src/config/environments.ts
const environments = {
  development: {
    apiUrl: 'http://localhost:3001',
    tallyHost: 'localhost',
    tallyPort: 9000,
  },
  staging: {
    apiUrl: 'https://staging-api.example.com',
    tallyHost: 'staging-tally.example.com',
    tallyPort: 9000,
  },
  production: {
    apiUrl: 'https://api.example.com',
    tallyHost: 'tally.example.com',
    tallyPort: 9000,
  },
};

export const config = environments[process.env.NODE_ENV as keyof typeof environments];
```

## Best Practices

1. **Consistency**: Follow established patterns and conventions
2. **Modularity**: Keep components small and focused
3. **Reusability**: Create shared components for common functionality
4. **Performance**: Optimize for loading speed and responsiveness
5. **Accessibility**: Ensure components are accessible to all users
6. **Documentation**: Document custom components and modifications
7. **Testing**: Write tests for custom functionality
8. **Version Control**: Use meaningful commit messages and branch names