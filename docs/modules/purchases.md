# Purchases Module

The Purchases module handles all procurement-related functionality including supplier management, purchase order tracking, and procurement analytics.

## Components

### PurchasesModule.tsx
Main purchases page with tabbed interface.

**Features**:
- Tab-based navigation
- Overview, Analytics, Suppliers, Transactions tabs
- Consistent with sales module design

### PurchaseOverview.tsx
High-level procurement metrics and recent activity.

**Features**:
- Key procurement KPIs
- Top suppliers list
- Recent purchase transactions
- Trend indicators

**Props**: None
**Data Source**: DashboardContext.purchases

### PurchaseAnalytics.tsx
Procurement analytics and supplier performance metrics.

**Features**:
- Monthly purchase trend bar chart
- Supplier performance metrics
- Cost savings tracking
- Quality and delivery metrics

**Props**: None
**Dependencies**: Chart.js

### SupplierManagement.tsx
Complete supplier database with performance tracking.

**Features**:
- Supplier search and filtering
- Supplier cards with contact information and ratings
- Performance metrics (reliability, quality score)
- Payment terms tracking

**Props**: None
**State**: 
- `searchTerm`: string for filtering suppliers

### PurchaseTransactions.tsx
Purchase order history and tracking.

**Features**:
- Purchase order table
- Status filtering and search
- Export capabilities
- Order tracking

**Props**: None
**State**:
- `searchTerm`: string
- `statusFilter`: 'all' | 'paid' | 'pending' | 'overdue'

## Usage

```typescript
import PurchasesModule from './modules/purchases/PurchasesModule';

// In your router
<Route path="/purchases" component={PurchasesModule} />
```

## Customization

### Adding Supplier Fields
Extend supplier data structure:
```typescript
const suppliers = data.purchases.topSuppliers.map((supplier, index) => ({
  ...supplier,
  certifications: ['ISO 9001', 'ISO 14001'],
  leadTime: Math.floor(Math.random() * 30) + 5,
  minimumOrderValue: 50000,
  // ... other fields
}));
```

### Performance Metrics
Add new performance indicators:
```typescript
const performanceMetrics = [
  {
    label: 'Quality Score',
    value: '4.7/5',
    color: 'green'
  },
  {
    label: 'Delivery Performance',
    value: '92.3%',
    color: 'blue'
  },
  // Add new metrics here
];
```

### Chart Customization
Modify purchase analytics charts:
```typescript
const chartData = {
  labels: data.purchases.monthlyTrend.labels,
  datasets: [{
    label: 'Purchase Amount',
    data: data.purchases.monthlyTrend.data,
    backgroundColor: 'rgba(16, 163, 74, 0.8)',
    // Add more styling options
  }]
};
```

## Data Structure

Expected data format:
```typescript
{
  purchases: {
    monthlyTrend: {
      labels: string[],
      data: number[]
    },
    topSuppliers: Array<{
      name: string,
      amount: number
    }>,
    recentTransactions: Array<{
      date: string,
      supplier: string,
      amount: number,
      status: 'Paid' | 'Pending' | 'Overdue'
    }>
  }
}
```

## API Integration Points

### Supplier Management
- `GET /api/suppliers` - Fetch suppliers
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Purchase Orders
- `GET /api/purchases/orders` - Fetch purchase orders
- `POST /api/purchases/orders` - Create purchase order
- `PUT /api/purchases/orders/:id` - Update order status

### Analytics
- `GET /api/purchases/analytics` - Procurement analytics
- `GET /api/purchases/supplier-performance` - Supplier metrics

## Supplier Evaluation Criteria

### Performance Metrics
- **Quality Score**: Product quality rating (1-5)
- **Delivery Performance**: On-time delivery percentage
- **Cost Competitiveness**: Price comparison with market
- **Reliability**: Consistency in delivery and quality
- **Communication**: Responsiveness and clarity

### Rating System
```typescript
const calculateSupplierRating = (metrics: SupplierMetrics) => {
  const weights = {
    quality: 0.3,
    delivery: 0.25,
    cost: 0.2,
    reliability: 0.15,
    communication: 0.1
  };
  
  return Object.entries(weights).reduce((total, [key, weight]) => {
    return total + (metrics[key] * weight);
  }, 0);
};
```

## Features to Implement

- [ ] Purchase order creation workflow
- [ ] Supplier onboarding process
- [ ] RFQ (Request for Quotation) management
- [ ] Contract management
- [ ] Supplier performance dashboards
- [ ] Automated reordering
- [ ] Purchase approval workflows