import React from 'react';
import PurchaseOverview from './components/PurchaseOverview';
import PurchaseAnalytics from './components/PurchaseAnalytics';
import SupplierManagement from './components/SupplierManagement';
import PurchaseTransactions from './components/PurchaseTransactions';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../sales/components/Tabs';

const PurchasesModule: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Purchase Management</h1>
        <p className="text-gray-600 mt-2">Manage your purchases, suppliers, and procurement analytics</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <PurchaseOverview />
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-6">
          <PurchaseAnalytics />
        </TabsContent>
        
        <TabsContent value="suppliers" className="space-y-6">
          <SupplierManagement />
        </TabsContent>
        
        <TabsContent value="transactions" className="space-y-6">
          <PurchaseTransactions />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PurchasesModule;