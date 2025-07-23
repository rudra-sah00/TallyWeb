# Shared Components

This document describes the reusable components available across all modules.

## Navigation Components

### Sidebar.tsx
Main navigation sidebar component.

**Props**:
- `currentView`: string - Currently active view
- `onViewChange`: (view: string) => void - View change handler

**Features**:
- Responsive design with mobile menu
- Active state highlighting
- Icon-based navigation
- Collapsible on mobile

**Usage**:
```typescript
<Sidebar 
  currentView={currentView} 
  onViewChange={setCurrentView} 
/>
```

## Tab Components

### Tabs.tsx, TabsList.tsx, TabsTrigger.tsx, TabsContent.tsx
Reusable tab system for module navigation.

**Features**:
- Context-based state management
- Flexible styling
- Keyboard navigation support

**Usage**:
```typescript
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="details">Details</TabsTrigger>
  </TabsList>
  
  <TabsContent value="overview">
    <OverviewComponent />
  </TabsContent>
  
  <TabsContent value="details">
    <DetailsComponent />
  </TabsContent>
</Tabs>
```

## Form Components

### SearchInput
Reusable search input with icon.

**Props**:
- `placeholder`: string
- `value`: string
- `onChange`: (value: string) => void

**Usage**:
```typescript
<SearchInput
  placeholder="Search items..."
  value={searchTerm}
  onChange={setSearchTerm}
/>
```

### FilterSelect
Dropdown filter component.

**Props**:
- `options`: Array<{value: string, label: string}>
- `value`: string
- `onChange`: (value: string) => void

**Usage**:
```typescript
<FilterSelect
  options={[
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' }
  ]}
  value={filter}
  onChange={setFilter}
/>
```

## Display Components

### StatusBadge
Colored status indicator.

**Props**:
- `status`: string
- `variant`: 'success' | 'warning' | 'error' | 'info'

**Usage**:
```typescript
<StatusBadge status="Paid" variant="success" />
```

### MetricCard
Reusable metric display card.

**Props**:
- `title`: string
- `value`: string | number
- `change`: string
- `trend`: 'up' | 'down'
- `icon`: React.ComponentType
- `color`: string

**Usage**:
```typescript
<MetricCard
  title="Total Sales"
  value={formatCurrency(totalSales)}
  change="+12.5%"
  trend="up"
  icon={ShoppingCart}
  color="green"
/>
```

## Table Components

### DataTable
Reusable data table with sorting and filtering.

**Props**:
- `columns`: Array<Column>
- `data`: Array<any>
- `searchable`: boolean
- `sortable`: boolean
- `pagination`: boolean

**Usage**:
```typescript
<DataTable
  columns={[
    { key: 'name', label: 'Name', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true }
  ]}
  data={tableData}
  searchable
  sortable
  pagination
/>
```

## Chart Components

### ChartContainer
Wrapper for Chart.js components with consistent styling.

**Props**:
- `title`: string
- `children`: React.ReactNode
- `height`: number

**Usage**:
```typescript
<ChartContainer title="Sales Trend" height={300}>
  <canvas ref={chartRef}></canvas>
</ChartContainer>
```

## Layout Components

### PageHeader
Consistent page header component.

**Props**:
- `title`: string
- `subtitle`: string
- `actions`: React.ReactNode

**Usage**:
```typescript
<PageHeader
  title="Sales Management"
  subtitle="Manage your sales and customers"
  actions={
    <button className="btn-primary">
      Add Sale
    </button>
  }
/>
```

### Card
Basic card container with consistent styling.

**Props**:
- `children`: React.ReactNode
- `className`: string
- `padding`: 'sm' | 'md' | 'lg'

**Usage**:
```typescript
<Card padding="lg">
  <h3>Card Title</h3>
  <p>Card content</p>
</Card>
```

## Utility Components

### LoadingSpinner
Loading indicator component.

**Props**:
- `size`: 'sm' | 'md' | 'lg'
- `color`: string

### EmptyState
Empty state placeholder.

**Props**:
- `title`: string
- `description`: string
- `action`: React.ReactNode

### ErrorBoundary
Error boundary for graceful error handling.

**Props**:
- `children`: React.ReactNode
- `fallback`: React.ComponentType

## Creating New Shared Components

### Guidelines
1. Keep components generic and reusable
2. Use TypeScript for prop definitions
3. Follow consistent naming conventions
4. Include proper documentation
5. Add to Storybook if available

### Template
```typescript
interface ComponentProps {
  // Define props here
}

const Component: React.FC<ComponentProps> = ({ 
  // destructure props 
}) => {
  return (
    // JSX here
  );
};

export default Component;
```

### Best Practices
- Use composition over inheritance
- Keep components small and focused
- Provide sensible defaults
- Make components accessible
- Use consistent styling patterns