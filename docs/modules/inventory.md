# Inventory Module

The Inventory module provides comprehensive stock management functionality including stock level monitoring, movement tracking, and automated reorder suggestions.

## Components

### InventoryModule.tsx
Main inventory page with tabbed interface.

**Features**:
- Tab-based navigation
- Overview, Stock Levels, Alerts, Movements tabs
- Real-time stock monitoring

### InventoryOverview.tsx
High-level inventory metrics and category breakdown.

**Features**:
- Total stock value and item count
- Stock category distribution
- Recent stock movements
- Turnover metrics

**Props**: None
**Data Source**: DashboardContext.stock

### StockLevels.tsx
Visual representation of current stock levels.

**Features**:
- Horizontal bar chart of stock levels
- Color-coded status indicators (Critical/Low/Normal)
- Detailed stock level table
- Minimum/Maximum level tracking

**Props**: None
**Dependencies**: Chart.js

### LowStockAlerts.tsx
Critical and low stock notifications with reorder suggestions.

**Features**:
- Critical stock alerts (< 50 units)
- Low stock warnings (< 100 units)
- Reorder recommendations
- Priority-based sorting
- Lead time calculations

**Props**: None
**State**: None (uses context data)

### InventoryMovements.tsx
Complete history of stock movements.

**Features**:
- Stock in/out tracking
- Movement type filtering
- Reference number tracking
- Reason code classification
- Export capabilities

**Props**: None
**State**:
- `searchTerm`: string
- `movementFilter`: 'all' | 'in' | 'out'

## Usage

```typescript
import InventoryModule from './modules/inventory/InventoryModule';

// In your router
<Route path="/inventory" component={InventoryModule} />
```

## Stock Level Management

### Status Classification
```typescript
const getStockStatus = (quantity: number) => {
  if (quantity < 50) return 'Critical';
  if (quantity < 100) return 'Low';
  return 'Normal';
};
```

### Reorder Calculations
```typescript
const calculateReorderPoint = (item: StockItem) => {
  const averageDailyUsage = item.monthlyUsage / 30;
  const leadTimeDays = item.leadTime || 7;
  const safetyStock = averageDailyUsage * 3; // 3 days safety
  
  return (averageDailyUsage * leadTimeDays) + safetyStock;
};
```

## Customization

### Adding Stock Categories
Update category breakdown in InventoryOverview.tsx:
```typescript
const stockCategories = [
  { category: 'Raw Materials', value: 45, color: 'blue' },
  { category: 'Finished Goods', value: 30, color: 'green' },
  { category: 'Work in Progress', value: 15, color: 'amber' },
  { category: 'Consumables', value: 10, color: 'purple' },
  // Add new categories here
];
```

### Movement Types
Extend movement tracking:
```typescript
const movementTypes = {
  'IN': {
    'PO': 'Purchase Order',
    'ADJ': 'Stock Adjustment',
    'RET': 'Return from Customer',
    'PROD': 'Production Output'
  },
  'OUT': {
    'SO': 'Sales Order',
    'ADJ': 'Stock Adjustment',
    'PROD': 'Production Consumption',
    'WASTE': 'Wastage/Damage'
  }
};
```

### Alert Thresholds
Customize alert levels:
```typescript
const alertThresholds = {
  critical: 50,    // Red alert
  low: 100,        // Amber warning
  reorder: 150     // Blue notification
};
```

## Data Structure

Expected inventory data format:
```typescript
{
  stock: {
    closingStockValue: number,
    lowStockCount: number,
    itemLevels: Array<{
      name: string,
      quantity: number,
      minLevel?: number,
      maxLevel?: number,
      leadTime?: number
    }>
  }
}
```

## API Integration Points

### Stock Management
- `GET /api/inventory/items` - Fetch all items
- `PUT /api/inventory/items/:id` - Update item details
- `POST /api/inventory/adjustments` - Stock adjustments

### Movement Tracking
- `GET /api/inventory/movements` - Fetch movements
- `POST /api/inventory/movements` - Record movement

### Alerts and Reports
- `GET /api/inventory/alerts` - Low stock alerts
- `GET /api/inventory/reorder-suggestions` - Reorder recommendations

## Inventory Valuation Methods

### FIFO (First In, First Out)
```typescript
const calculateFIFOValue = (movements: Movement[]) => {
  // Implementation for FIFO valuation
};
```

### Weighted Average
```typescript
const calculateWeightedAverage = (movements: Movement[]) => {
  const totalValue = movements.reduce((sum, m) => sum + (m.quantity * m.unitCost), 0);
  const totalQuantity = movements.reduce((sum, m) => sum + m.quantity, 0);
  return totalValue / totalQuantity;
};
```

## Automated Reordering

### Reorder Point Formula
```
Reorder Point = (Average Daily Usage × Lead Time) + Safety Stock
```

### Economic Order Quantity (EOQ)
```
EOQ = √((2 × Annual Demand × Ordering Cost) / Holding Cost per Unit)
```

## Features to Implement

- [ ] Barcode scanning integration
- [ ] Cycle counting schedules
- [ ] ABC analysis
- [ ] Inventory valuation reports
- [ ] Automated purchase requisitions
- [ ] Multi-location inventory
- [ ] Serial number tracking
- [ ] Expiry date management