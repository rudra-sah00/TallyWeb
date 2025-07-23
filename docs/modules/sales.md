# Sales Module

The Sales module provides comprehensive sales management functionality including customer management, transaction tracking, and sales analytics.

## Components

### SalesModule.tsx
Main sales page with tabbed interface for different sales functions.

**Features**:
- Tab-based navigation
- Overview, Analytics, Customers, Transactions tabs
- Responsive design

### SalesOverview.tsx
High-level sales metrics and recent activity.

**Features**:
- Key sales KPIs (Total Sales, Active Customers, etc.)
- Top customers list
- Recent sales transactions
- Trend indicators

**Props**: None
**Data Source**: DashboardContext.sales

### SalesAnalytics.tsx
Interactive charts and performance metrics.

**Features**:
- Monthly sales trend line chart
- Customer revenue distribution pie chart
- Performance metrics cards
- Chart.js integration

**Props**: None
**Dependencies**: Chart.js, react-chartjs-2

### CustomerManagement.tsx
Complete customer database with CRUD operations.

**Features**:
- Customer search and filtering
- Customer cards with contact information
- Add/Edit/Delete functionality (UI only)
- Customer metrics (total orders, revenue, etc.)

**Props**: None
**State**: 
- `searchTerm`: string for filtering customers

### SalesTransactions.tsx
Detailed transaction history with advanced filtering.

**Features**:
- Transaction table with sorting
- Status filtering
- Search functionality
- Export capabilities (UI only)
- Pagination

**Props**: None
**State**:
- `searchTerm`: string
- `statusFilter`: 'all' | 'paid' | 'pending' | 'overdue'

## Usage

```typescript
import SalesModule from './modules/sales/SalesModule';

// In your router
<Route path="/sales" component={SalesModule} />
```

## Customization

### Adding New Tabs
1. Create new component in `components/` folder
2. Add tab to TabsList in SalesModule.tsx
3. Add corresponding TabsContent

```typescript
<TabsTrigger value="new-tab">New Tab</TabsTrigger>
// ...
<TabsContent value="new-tab">
  <NewTabComponent />
</TabsContent>
```

### Modifying Charts
Update chart configuration in SalesAnalytics.tsx:
```typescript
const chartOptions = {
  // Chart.js options
  responsive: true,
  plugins: {
    legend: {
      position: 'top',
    },
  },
};
```

### Customer Fields
Add new fields to customer data structure:
```typescript
const customers = data.sales.topCustomers.map((customer, index) => ({
  ...customer,
  newField: 'new value',
  // ... other fields
}));
```

## Data Structure

Expected data format from context:
```typescript
{
  sales: {
    monthlyTrend: {
      labels: string[],
      data: number[]
    },
    topCustomers: Array<{
      name: string,
      amount: number
    }>,
    recentTransactions: Array<{
      date: string,
      customer: string,
      amount: number,
      status: 'Paid' | 'Pending' | 'Overdue'
    }>
  }
}
```

## API Integration Points

### Customer Management
- `GET /api/customers` - Fetch customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer

### Sales Transactions
- `GET /api/sales/transactions` - Fetch transactions
- `GET /api/sales/analytics` - Fetch analytics data

### Sales Analytics
- `GET /api/sales/monthly-trend` - Monthly sales data
- `GET /api/sales/customer-distribution` - Customer revenue data

## Features to Implement

- [ ] Customer creation/editing forms
- [ ] Transaction detail modal
- [ ] Advanced filtering options
- [ ] Export functionality
- [ ] Real-time updates
- [ ] Sales forecasting
- [ ] Customer communication tracking