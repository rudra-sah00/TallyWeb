import React from 'react';
import OverviewCards from './components/OverviewCards';
import CashBankOverview from './components/CashBankOverview';
import QuickStats from './components/QuickStats';
import RecentActivity from './components/RecentActivity';

const Dashboard: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Overview</h1>
        <p className="text-gray-600 mt-2">Welcome to your comprehensive financial dashboard</p>
      </div>

      <OverviewCards />
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CashBankOverview />
        <QuickStats />
      </div>

      <RecentActivity />
    </div>
  );
};

export default Dashboard;