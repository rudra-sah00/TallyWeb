import React, { useState } from 'react';
import SalesOverview from './components/SalesOverview';
import SalesAnalytics from './components/SalesAnalytics';
import CustomerManagement from './components/CustomerManagement';
import SalesTransactions from './components/SalesTransactions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/Tabs';

const SalesModule: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Sales Management</h1>
        <p className="text-gray-600 mt-2">Manage your sales, customers, and revenue analytics</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <SalesOverview />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          <SalesAnalytics />
        </TabsContent>
        
        <TabsContent value="customers" className="space-y-6">
          <CustomerManagement />
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-6">
          <SalesTransactions />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesModule;