// Dummy data generator for the financial dashboard application

export interface DashboardData {
  overview: {
    totalSales: number;
    totalPurchases: number;
    totalExpenses: number;
    netProfit: number;
    gstPayable: number;
    cashBank: number;
  };
  cashBank: {
    cashInHand: number;
    bankBalance: number;
    receivables: number;
    payables: number;
    recentChanges: {
      cash: string;
      bank: string;
      receivables: string;
      payables: string;
    };
  };
  outstanding: {
    receivable: Array<{
      id: string;
      customer: string;
      amount: number;
      dueDate: string;
      daysOverdue: number;
    }>;
    payable: Array<{
      id: string;
      supplier: string;
      amount: number;
      dueDate: string;
      daysOverdue: number;
    }>;
  };
  expenses: {
    recentEntries: Array<{
      id: string;
      description: string;
      amount: number;
      date: string;
      category: string;
    }>;
    monthlyTrend: {
      labels: string[];
      data: number[];
    };
  };
  sales: {
    monthlyTrend: {
      labels: string[];
      data: number[];
    };
    topCustomers: Array<{
      name: string;
      amount: number;
      orders: number;
      status: 'Active' | 'Inactive';
    }>;
    recentTransactions: Array<{
      id: string;
      date: string;
      customer: string;
      amount: number;
      status: 'Paid' | 'Pending' | 'Overdue';
    }>;
    analytics: {
      totalRevenue: number;
      activeCustomers: number;
      averageOrderValue: number;
      conversionRate: number;
    };
  };
  purchases: {
    monthlyTrend: {
      labels: string[];
      data: number[];
    };
    topSuppliers: Array<{
      name: string;
      amount: number;
      orders: number;
      rating: number;
      status: 'Active' | 'Inactive';
    }>;
    recentTransactions: Array<{
      id: string;
      date: string;
      supplier: string;
      amount: number;
      status: 'Paid' | 'Pending' | 'Overdue';
    }>;
    analytics: {
      totalSpend: number;
      activeSuppliers: number;
      averageOrderValue: number;
      qualityScore: number;
    };
  };
  stock: {
    closingStockValue: number;
    lowStockCount: number;
    categories: Array<{
      category: string;
      value: number;
      percentage: number;
      color: string;
    }>;
    itemLevels: Array<{
      name: string;
      quantity: number;
      status: 'Critical' | 'Low' | 'Normal';
      minLevel?: number;
      maxLevel?: number;
      leadTime?: number;
    }>;
    movements: Array<{
      id: string;
      date: string;
      item: string;
      type: 'IN' | 'OUT';
      quantity: number;
      reference: string;
      reason: string;
    }>;
    alerts: {
      critical: Array<{
        item: string;
        currentStock: number;
        minLevel: number;
        reorderSuggestion: number;
      }>;
      low: Array<{
        item: string;
        currentStock: number;
        minLevel: number;
        reorderSuggestion: number;
      }>;
    };
  };
  quickStats: {
    overdueBills: number;
    lowStockAlerts: number;
    paymentsDue: number;
    gstDueDate: string;
  };
  recentActivity: Array<{
    id: string;
    type: 'Sales' | 'Purchase' | 'Expense' | 'Stock';
    description: string;
    amount?: number;
    date: string;
    status: 'Completed' | 'Pending' | 'Failed';
  }>;
}

export const generateDummyData = (): DashboardData => {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  // Generate monthly trend data for the last 12 months
  const generateMonthlyTrend = (baseAmount: number, variance: number = 0.3) => {
    const data = [];
    for (let i = 0; i < 12; i++) {
      const variation = (Math.random() - 0.5) * variance;
      data.push(Math.floor(baseAmount * (1 + variation)));
    }
    return {
      labels: monthNames,
      data
    };
  };

  // Generate random customers
  const customers = [
    'Acme Corp', 'TechFlow Solutions', 'Global Industries', 'Metro Supplies',
    'Prime Ventures', 'Skyline Enterprises', 'Ocean Trading', 'Mountain Co',
    'River Systems', 'Forest Products', 'Desert Solutions', 'Valley Corp'
  ];

  // Generate random suppliers
  const suppliers = [
    'ABC Suppliers', 'XYZ Manufacturing', 'Best Materials Co', 'Quality Parts Ltd',
    'Premium Goods Inc', 'Reliable Sources', 'Top Grade Materials', 'Elite Supplies',
    'Professional Parts', 'Industrial Solutions', 'Trade Partners', 'Supply Chain Co'
  ];

  // Generate random items
  const items = [
    'Raw Material A', 'Component B', 'Finished Product C', 'Tool D',
    'Material E', 'Part F', 'Assembly G', 'Hardware H',
    'Chemical I', 'Equipment J', 'Supply K', 'Resource L'
  ];

  const salesTrend = generateMonthlyTrend(3800000, 0.4);
  const purchaseTrend = generateMonthlyTrend(2700000, 0.3);
  const expenseTrend = generateMonthlyTrend(730000, 0.2);

  return {
    overview: {
      totalSales: 45750000,
      totalPurchases: 32400000,
      totalExpenses: 8750000,
      netProfit: 4600000,
      gstPayable: 2340000,
      cashBank: 8950000
    },
    cashBank: {
      cashInHand: 450000,
      bankBalance: 8500000,
      receivables: 5600000,
      payables: 3200000,
      recentChanges: {
        cash: '+2.5%',
        bank: '+1.2%',
        receivables: '-3.1%',
        payables: '+4.7%'
      }
    },
    outstanding: {
      receivable: Array.from({ length: 15 }, (_, index) => {
        const daysOverdue = Math.floor(Math.random() * 60) - 15; // -15 to 45 days
        return {
          id: `REC-${(index + 1).toString().padStart(4, '0')}`,
          customer: customers[Math.floor(Math.random() * customers.length)],
          amount: Math.floor(Math.random() * 200000) + 25000,
          dueDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          daysOverdue: Math.max(0, daysOverdue)
        };
      }),
      payable: Array.from({ length: 12 }, (_, index) => {
        const daysOverdue = Math.floor(Math.random() * 45) - 10; // -10 to 35 days
        return {
          id: `PAY-${(index + 1).toString().padStart(4, '0')}`,
          supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
          amount: Math.floor(Math.random() * 150000) + 20000,
          dueDate: new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          daysOverdue: Math.max(0, daysOverdue)
        };
      })
    },
    expenses: {
      recentEntries: Array.from({ length: 10 }, (_, index) => ({
        id: `EXP-${(index + 1).toString().padStart(4, '0')}`,
        description: [
          'Office Rent Payment', 'Electricity Bill', 'Internet & Phone',
          'Marketing Expenses', 'Travel & Transportation', 'Office Supplies',
          'Insurance Premium', 'Legal & Professional', 'Maintenance Costs',
          'Software Subscriptions'
        ][index],
        amount: Math.floor(Math.random() * 50000) + 5000,
        date: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        category: ['Office', 'Utilities', 'Marketing', 'Travel', 'Professional'][Math.floor(Math.random() * 5)]
      })),
      monthlyTrend: expenseTrend
    },
    sales: {
      monthlyTrend: salesTrend,
      topCustomers: customers.slice(0, 8).map((name) => ({
        name,
        amount: Math.floor(Math.random() * 2000000) + 500000,
        orders: Math.floor(Math.random() * 50) + 10,
        status: Math.random() > 0.2 ? 'Active' : 'Inactive' as 'Active' | 'Inactive'
      })),
      recentTransactions: Array.from({ length: 15 }, (_, index) => ({
        id: `SAL-${(index + 1).toString().padStart(4, '0')}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        customer: customers[Math.floor(Math.random() * customers.length)],
        amount: Math.floor(Math.random() * 500000) + 50000,
        status: ['Paid', 'Pending', 'Overdue'][Math.floor(Math.random() * 3)] as 'Paid' | 'Pending' | 'Overdue'
      })),
      analytics: {
        totalRevenue: 45750000,
        activeCustomers: 127,
        averageOrderValue: 180500,
        conversionRate: 68.5
      }
    },
    purchases: {
      monthlyTrend: purchaseTrend,
      topSuppliers: suppliers.slice(0, 8).map((name) => ({
        name,
        amount: Math.floor(Math.random() * 1500000) + 300000,
        orders: Math.floor(Math.random() * 30) + 5,
        rating: Math.floor(Math.random() * 20) / 10 + 3.5, // 3.5 to 5.0
        status: Math.random() > 0.15 ? 'Active' : 'Inactive' as 'Active' | 'Inactive'
      })),
      recentTransactions: Array.from({ length: 12 }, (_, index) => ({
        id: `PUR-${(index + 1).toString().padStart(4, '0')}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
        amount: Math.floor(Math.random() * 300000) + 25000,
        status: ['Paid', 'Pending', 'Overdue'][Math.floor(Math.random() * 3)] as 'Paid' | 'Pending' | 'Overdue'
      })),
      analytics: {
        totalSpend: 32400000,
        activeSuppliers: 89,
        averageOrderValue: 145000,
        qualityScore: 4.2
      }
    },
    stock: {
      closingStockValue: 12750000,
      lowStockCount: 23,
      categories: [
        { category: 'Raw Materials', value: 45, percentage: 45, color: 'blue' },
        { category: 'Finished Goods', value: 30, percentage: 30, color: 'green' },
        { category: 'Work in Progress', value: 15, percentage: 15, color: 'amber' },
        { category: 'Consumables', value: 10, percentage: 10, color: 'purple' }
      ],
      itemLevels: items.map((name) => {
        const quantity = Math.floor(Math.random() * 200) + 20;
        const minLevel = Math.floor(Math.random() * 50) + 30;
        const maxLevel = minLevel + Math.floor(Math.random() * 150) + 50;
        let status: 'Critical' | 'Low' | 'Normal' = 'Normal';
        
        if (quantity < 50) status = 'Critical';
        else if (quantity < 100) status = 'Low';
        
        return {
          name,
          quantity,
          status,
          minLevel,
          maxLevel,
          leadTime: Math.floor(Math.random() * 14) + 3
        };
      }),
      movements: Array.from({ length: 20 }, (_, index) => ({
        id: `MOV-${(index + 1).toString().padStart(4, '0')}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        item: items[Math.floor(Math.random() * items.length)],
        type: Math.random() > 0.5 ? 'IN' : 'OUT' as 'IN' | 'OUT',
        quantity: Math.floor(Math.random() * 100) + 10,
        reference: `REF-${Math.floor(Math.random() * 9000) + 1000}`,
        reason: ['Purchase Order', 'Sales Order', 'Stock Adjustment', 'Return'][Math.floor(Math.random() * 4)]
      })),
      alerts: {
        critical: items.filter((_, index) => index % 5 === 0).slice(0, 5).map(item => ({
          item,
          currentStock: Math.floor(Math.random() * 30) + 10,
          minLevel: 50,
          reorderSuggestion: Math.floor(Math.random() * 200) + 100
        })),
        low: items.filter((_, index) => index % 4 === 0).slice(0, 6).map(item => ({
          item,
          currentStock: Math.floor(Math.random() * 50) + 50,
          minLevel: 100,
          reorderSuggestion: Math.floor(Math.random() * 150) + 75
        }))
      }
    },
    quickStats: {
      overdueBills: 12,
      lowStockAlerts: 23,
      paymentsDue: 8,
      gstDueDate: '2025-07-28'
    },
    recentActivity: Array.from({ length: 10 }, (_, index) => {
      const types = ['Sales', 'Purchase', 'Expense', 'Stock'] as const;
      const type = types[Math.floor(Math.random() * types.length)];
      const statuses = ['Completed', 'Pending', 'Failed'] as const;
      
      return {
        id: `ACT-${(index + 1).toString().padStart(4, '0')}`,
        type,
        description: `${type} transaction ${index + 1}`,
        amount: Math.random() > 0.3 ? Math.floor(Math.random() * 100000) + 10000 : undefined,
        date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        status: statuses[Math.floor(Math.random() * statuses.length)]
      };
    })
  };
};
