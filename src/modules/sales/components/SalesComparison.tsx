import React, { useMemo } from 'react';
import { SalesVoucher } from '../../../services/api/sales/salesApiService';
import { formatCurrency } from '../../../shared/utils/formatters';
import { BarChart3, TrendingUp, TrendingDown, Calendar, RefreshCw, ArrowUpDown } from 'lucide-react';

interface SalesComparisonProps {
  currentPeriodVouchers: SalesVoucher[];
  previousPeriodVouchers: SalesVoucher[];
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  loading: boolean;
}

export const SalesComparison: React.FC<SalesComparisonProps> = ({
  currentPeriodVouchers,
  previousPeriodVouchers,
  currentPeriodLabel,
  previousPeriodLabel,
  loading
}) => {
  const comparisonMetrics = useMemo(() => {
    const currentSales = currentPeriodVouchers.reduce((sum, v) => sum + v.amount, 0);
    const currentVouchers = currentPeriodVouchers.length;
    const currentCustomers = new Set(currentPeriodVouchers.map(v => v.partyName)).size;
    const currentAvgOrder = currentVouchers > 0 ? currentSales / currentVouchers : 0;

    const comparisonSales = previousPeriodVouchers.reduce((sum, v) => sum + v.amount, 0);
    const comparisonVouchersCount = previousPeriodVouchers.length;
    const comparisonCustomers = new Set(previousPeriodVouchers.map(v => v.partyName)).size;
    const comparisonAvgOrder = comparisonVouchersCount > 0 ? comparisonSales / comparisonVouchersCount : 0;

    const salesGrowth = comparisonSales > 0 ? ((currentSales - comparisonSales) / comparisonSales) * 100 : 0;
    const vouchersGrowth = comparisonVouchersCount > 0 ? ((currentVouchers - comparisonVouchersCount) / comparisonVouchersCount) * 100 : 0;
    const customersGrowth = comparisonCustomers > 0 ? ((currentCustomers - comparisonCustomers) / comparisonCustomers) * 100 : 0;
    const avgOrderGrowth = comparisonAvgOrder > 0 ? ((currentAvgOrder - comparisonAvgOrder) / comparisonAvgOrder) * 100 : 0;

    return {
      current: {
        sales: currentSales,
        vouchers: currentVouchers,
        customers: currentCustomers,
        avgOrder: currentAvgOrder
      },
      comparison: {
        sales: comparisonSales,
        vouchers: comparisonVouchersCount,
        customers: comparisonCustomers,
        avgOrder: comparisonAvgOrder
      },
      growth: {
        sales: salesGrowth,
        vouchers: vouchersGrowth,
        customers: customersGrowth,
        avgOrder: avgOrderGrowth
      }
    };
  }, [currentPeriodVouchers, previousPeriodVouchers]);

  const MetricCard = ({ 
    title, 
    currentValue, 
    comparisonValue, 
    growth, 
    formatter = (val: number | string) => val.toString(),
    icon: Icon 
  }: { 
    title: string;
    currentValue: number;
    comparisonValue: number;
    growth: number;
    formatter?: (val: number | string) => string;
    icon: React.ComponentType<any>;
  }) => (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 hover:shadow-2xl transition-shadow duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider">{title}</h3>
        <div className="p-2 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-lg">
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">{currentPeriodLabel}</p>
          <p className="text-3xl font-bold text-gray-900">{formatter(currentValue)}</p>
        </div>
        
        <div>
          <p className="text-xs text-gray-500 mb-1">{previousPeriodLabel}</p>
          <p className="text-xl font-semibold text-gray-700">{formatter(comparisonValue)}</p>
        </div>
        
        <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
          {growth >= 0 ? (
            <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 rounded-full">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">
                +{Math.abs(growth).toFixed(1)}%
              </span>
            </div>
          ) : (
            <div className="flex items-center space-x-1 px-3 py-1 bg-red-100 rounded-full">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm font-semibold text-red-700">
                -{Math.abs(growth).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
          <span className="text-lg text-gray-600">Loading comparison data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Period Comparison Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 p-6">
        <div className="flex items-center justify-center space-x-4">
          <div className="text-center">
            <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-semibold">
              {currentPeriodLabel}
            </div>
            <p className="text-sm text-gray-600 mt-2">Current Period</p>
          </div>
          
          <ArrowUpDown className="h-8 w-8 text-blue-500" />
          
          <div className="text-center">
            <div className="px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white rounded-xl font-semibold">
              {previousPeriodLabel}
            </div>
            <p className="text-sm text-gray-600 mt-2">Previous Period</p>
          </div>
        </div>
      </div>

      {/* Comparison Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sales"
          currentValue={comparisonMetrics.current.sales}
          comparisonValue={comparisonMetrics.comparison.sales}
          growth={comparisonMetrics.growth.sales}
          formatter={(val) => formatCurrency(val as number)}
          icon={BarChart3}
        />
        
        <MetricCard
          title="Total Orders"
          currentValue={comparisonMetrics.current.vouchers}
          comparisonValue={comparisonMetrics.comparison.vouchers}
          growth={comparisonMetrics.growth.vouchers}
          icon={Calendar}
        />
        
        <MetricCard
          title="Unique Customers"
          currentValue={comparisonMetrics.current.customers}
          comparisonValue={comparisonMetrics.comparison.customers}
          growth={comparisonMetrics.growth.customers}
          icon={Calendar}
        />
        
        <MetricCard
          title="Avg Order Value"
          currentValue={comparisonMetrics.current.avgOrder}
          comparisonValue={comparisonMetrics.comparison.avgOrder}
          growth={comparisonMetrics.growth.avgOrder}
          formatter={(val) => formatCurrency(val as number)}
          icon={TrendingUp}
        />
      </div>

      {/* Detailed Comparison */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Detailed Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h4 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
              <div className="p-1 bg-blue-500 rounded">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              {currentPeriodLabel}
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-sm font-medium text-gray-600">Total Revenue</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(comparisonMetrics.current.sales)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-sm font-medium text-gray-600">Total Orders</span>
                <span className="text-lg font-bold text-gray-900">{comparisonMetrics.current.vouchers}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-sm font-medium text-gray-600">Unique Customers</span>
                <span className="text-lg font-bold text-gray-900">{comparisonMetrics.current.customers}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-sm font-medium text-gray-600">Avg Order Value</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(comparisonMetrics.current.avgOrder)}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
            <h4 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
              <div className="p-1 bg-gray-500 rounded">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              {previousPeriodLabel}
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-sm font-medium text-gray-600">Total Revenue</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(comparisonMetrics.comparison.sales)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-sm font-medium text-gray-600">Total Orders</span>
                <span className="text-lg font-bold text-gray-900">{comparisonMetrics.comparison.vouchers}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-sm font-medium text-gray-600">Unique Customers</span>
                <span className="text-lg font-bold text-gray-900">{comparisonMetrics.comparison.customers}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                <span className="text-sm font-medium text-gray-600">Avg Order Value</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(comparisonMetrics.comparison.avgOrder)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-8">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-700 mb-4">Key Insights</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                <div className={`p-2 rounded-full ${comparisonMetrics.growth.sales >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {comparisonMetrics.growth.sales >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Sales {comparisonMetrics.growth.sales >= 0 ? 'increased' : 'decreased'} by {Math.abs(comparisonMetrics.growth.sales).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                <div className={`p-2 rounded-full ${comparisonMetrics.growth.vouchers >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {comparisonMetrics.growth.vouchers >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Order volume {comparisonMetrics.growth.vouchers >= 0 ? 'grew' : 'declined'} by {Math.abs(comparisonMetrics.growth.vouchers).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                <div className={`p-2 rounded-full ${comparisonMetrics.growth.customers >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {comparisonMetrics.growth.customers >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Customer base {comparisonMetrics.growth.customers >= 0 ? 'expanded' : 'contracted'} by {Math.abs(comparisonMetrics.growth.customers).toFixed(1)}%
                </span>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                <div className={`p-2 rounded-full ${comparisonMetrics.growth.avgOrder >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {comparisonMetrics.growth.avgOrder >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  Average order value {comparisonMetrics.growth.avgOrder >= 0 ? 'improved' : 'declined'} by {Math.abs(comparisonMetrics.growth.avgOrder).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-gray-700 mb-4">Overall Performance</h4>
            <div className="p-6 bg-white rounded-xl text-center">
              {comparisonMetrics.growth.sales >= 0 ? (
                <div className="space-y-3">
                  <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                  <h5 className="text-xl font-bold text-green-600">Positive Growth</h5>
                  <p className="text-sm text-gray-600">Your sales performance is trending upward</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-red-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                    <TrendingDown className="h-8 w-8 text-red-600" />
                  </div>
                  <h5 className="text-xl font-bold text-red-600">Declining Performance</h5>
                  <p className="text-sm text-gray-600">Consider reviewing your sales strategy</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesComparison;
