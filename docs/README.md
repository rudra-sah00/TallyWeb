# Financial Dashboard Application

A comprehensive financial dashboard application built with React.js and TypeScript, designed for Tally integration and financial data management.

## Project Structure

```
src/
├── modules/                    # Feature-based modules
│   ├── dashboard/             # Main dashboard module
│   ├── sales/                 # Sales management module
│   ├── purchases/             # Purchase management module
│   └── inventory/             # Inventory management module
├── shared/                    # Shared components and utilities
│   ├── components/            # Reusable UI components
│   ├── hooks/                 # Custom React hooks
│   └── utils/                 # Utility functions
├── context/                   # React context providers
└── docs/                      # Documentation
```

## Features

### Dashboard Module
- **Overview Cards**: Key financial metrics with trend indicators
- **Cash & Bank Overview**: Real-time balance tracking
- **Quick Stats**: Important alerts and notifications
- **Recent Activity**: Latest transactions across all modules

### Sales Module
- **Sales Overview**: Revenue metrics and top customers
- **Sales Analytics**: Interactive charts and performance metrics
- **Customer Management**: Complete customer database with contact information
- **Sales Transactions**: Detailed transaction history with filtering

### Purchases Module
- **Purchase Overview**: Procurement metrics and top suppliers
- **Purchase Analytics**: Spending analysis and supplier performance
- **Supplier Management**: Supplier database with ratings and contact details
- **Purchase Transactions**: Complete purchase order history

### Inventory Module
- **Inventory Overview**: Stock value and category breakdown
- **Stock Levels**: Visual representation of current stock levels
- **Low Stock Alerts**: Critical and low stock notifications with reorder suggestions
- **Inventory Movements**: Complete stock movement history

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Architecture

### Modular Design
Each module is self-contained with its own components, logic, and routing. This makes the application:
- **Scalable**: Easy to add new modules
- **Maintainable**: Clear separation of concerns
- **Testable**: Isolated functionality

### Component Structure
- **Page Components**: Main module entry points
- **Feature Components**: Specific functionality within modules
- **Shared Components**: Reusable UI elements

### State Management
- **Context API**: Global state management
- **Local State**: Component-specific state
- **Custom Hooks**: Reusable state logic

## Customization

### Adding New Modules
1. Create a new folder in `src/modules/`
2. Add module components and routing
3. Update the main App.tsx navigation
4. Add documentation in `docs/modules/`

### Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Responsive Design**: Mobile-first approach
- **Color System**: Consistent color palette
- **Component Variants**: Reusable style patterns

### Data Integration
- **Dummy Data**: Currently uses mock data
- **API Ready**: Structure prepared for API integration
- **Tally Integration**: Designed for Tally XML API

## Documentation

- [Dashboard Module](./modules/dashboard.md)
- [Sales Module](./modules/sales.md)
- [Purchases Module](./modules/purchases.md)
- [Inventory Module](./modules/inventory.md)
- [Shared Components](./shared/components.md)
- [API Integration](./api-integration.md)
- [Customization Guide](./customization.md)

## Contributing

1. Follow the modular architecture
2. Use TypeScript for type safety
3. Write comprehensive documentation
4. Test components thoroughly
5. Follow naming conventions

## License

This project is licensed under the MIT License.