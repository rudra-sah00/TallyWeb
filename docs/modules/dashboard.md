# Dashboard Module

The Dashboard module provides a comprehensive overview of the financial system with key metrics, recent activities, and quick access to important information.

## Components

### Dashboard.tsx
Main dashboard page component that orchestrates all dashboard widgets.

**Props**: None
**State**: None (uses context)

### OverviewCards.tsx
Displays six key financial metrics in card format.

**Features**:
- Total Sales, Purchases, Expenses, Net Profit, GST Payable, Cash & Bank
- Trend indicators with percentage changes
- Color-coded icons for visual distinction
- Hover effects for better UX

**Props**: None
**Data Source**: DashboardContext

**Customization**:
```typescript
// Add new card
{
  title: 'New Metric',
  value: data.newMetric,
  change: '+10%',
  trend: 'up',
  icon: NewIcon,
  color: 'blue'
}
```

### CashBankOverview.tsx
Shows detailed cash and bank position.

**Features**:
- Cash in Hand, Bank Balance, Receivables, Payables
- Recent changes tracking
- Color-coded status indicators

**Props**: None
**Data Source**: DashboardContext.cashBank

### QuickStats.tsx
Displays important alerts and quick statistics.

**Features**:
- Overdue bills count
- Low stock alerts
- Payment status summary
- GST due date countdown

**Props**: None
**Data Source**: Multiple context sources

### RecentActivity.tsx
Shows latest transactions across all modules.

**Features**:
- Combined activity feed from sales, purchases, expenses
- Transaction type indicators
- Status badges
- Chronological sorting

**Props**: None
**Data Source**: Multiple context sources

## Usage

```typescript
import Dashboard from './modules/dashboard/Dashboard';

// In your router
<Route path="/dashboard" component={Dashboard} />
```

## Customization

### Adding New Widgets
1. Create component in `components/` folder
2. Import and add to Dashboard.tsx
3. Update grid layout if needed

### Modifying Metrics
Update the cards array in OverviewCards.tsx:
```typescript
const cards = [
  // existing cards...
  {
    title: 'Custom Metric',
    value: customValue,
    change: '+5%',
    trend: 'up',
    icon: CustomIcon,
    color: 'purple'
  }
];
```

### Styling
All components use Tailwind CSS classes. Modify colors, spacing, and layout by updating className props.

## Data Requirements

The dashboard expects data from DashboardContext with the following structure:
```typescript
{
  overview: {
    totalSales: number,
    totalPurchases: number,
    totalExpenses: number,
    netProfit: number,
    gstPayable: number,
    cashBank: number
  },
  cashBank: {
    cashInHand: number,
    bankBalance: number,
    receivables: number,
    payables: number
  },
  // ... other module data
}
```

## Future Enhancements

- Real-time data updates
- Customizable dashboard layout
- Widget drag-and-drop functionality
- Export dashboard as PDF
- Dashboard templates