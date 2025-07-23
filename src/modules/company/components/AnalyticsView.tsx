import React from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadialBarChart, RadialBar
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon,
  BarChart3, Activity, Target, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { BalanceSheetData } from '../../../services/api/balanceSheetApiService';

interface AnalyticsViewProps {
  balanceSheet: BalanceSheetData | null;
  loading: boolean;
  formatCurrency: (amount: number) => string;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ balanceSheet, loading, formatCurrency }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!balanceSheet) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data Available</h3>
        <p className="text-gray-500">Financial analytics require balance sheet data to be loaded first.</p>
      </div>
    );
  }

  // Prepare data for charts
  const assetsData = balanceSheet.assets
    .filter(asset => {
      const amount = Math.abs(asset.mainAmount !== 0 ? asset.mainAmount : asset.subAmount);
      return amount > 0;
    })
    .map(asset => ({
      name: asset.name.length > 20 ? asset.name.substring(0, 20) + '...' : asset.name,
      fullName: asset.name,
      value: Math.abs(asset.mainAmount !== 0 ? asset.mainAmount : asset.subAmount),
      percentage: ((Math.abs(asset.mainAmount !== 0 ? asset.mainAmount : asset.subAmount) / balanceSheet.totalAssets) * 100)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 assets

  const liabilitiesData = balanceSheet.liabilities
    .filter(liability => {
      const amount = Math.abs(liability.mainAmount !== 0 ? liability.mainAmount : liability.subAmount);
      return amount > 0;
    })
    .map(liability => ({
      name: liability.name.length > 20 ? liability.name.substring(0, 20) + '...' : liability.name,
      fullName: liability.name,
      value: Math.abs(liability.mainAmount !== 0 ? liability.mainAmount : liability.subAmount),
      percentage: ((Math.abs(liability.mainAmount !== 0 ? liability.mainAmount : liability.subAmount) / balanceSheet.totalLiabilities) * 100)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8); // Top 8 liabilities

  // Financial ratios and insights
  const currentRatio = balanceSheet.totalAssets / balanceSheet.totalLiabilities;
  const assetEfficiency = balanceSheet.totalAssets > 0 ? (Math.abs(balanceSheet.netWorth) / balanceSheet.totalAssets) * 100 : 0;
  const leverageRatio = balanceSheet.totalLiabilities / balanceSheet.totalAssets;

  // Enhanced Key metrics with better business insights
  const keyMetrics = [
    {
      label: 'Liquidity Ratio',
      value: currentRatio.toFixed(2),
      description: 'Assets vs Liabilities',
      icon: Target,
      color: currentRatio > 1.5 ? 'green' : currentRatio > 1 ? 'orange' : 'red',
      trend: currentRatio > 1.5 ? 'up' : 'down',
      insight: currentRatio > 1.5 ? 'Strong liquidity position' : currentRatio > 1 ? 'Adequate liquidity' : 'Liquidity concerns'
    },
    {
      label: 'Financial Leverage',
      value: `${(leverageRatio * 100).toFixed(1)}%`,
      description: 'Debt to Asset Ratio',
      icon: BarChart3,
      color: leverageRatio < 0.4 ? 'green' : leverageRatio < 0.6 ? 'orange' : 'red',
      trend: leverageRatio < 0.4 ? 'up' : 'down',
      insight: leverageRatio < 0.4 ? 'Conservative leverage' : leverageRatio < 0.6 ? 'Moderate leverage' : 'High leverage'
    },
    {
      label: 'Net Worth',
      value: formatCurrency(balanceSheet.netWorth),
      description: 'Shareholders Equity',
      icon: DollarSign,
      color: balanceSheet.netWorth > 0 ? 'green' : 'red',
      trend: balanceSheet.netWorth > 0 ? 'up' : 'down',
      insight: balanceSheet.netWorth > 0 ? 'Positive equity' : 'Negative equity'
    },
    {
      label: 'Asset Efficiency',
      value: `${assetEfficiency.toFixed(1)}%`,
      description: 'Equity to Asset Ratio',
      icon: Activity,
      color: assetEfficiency > 50 ? 'green' : assetEfficiency > 25 ? 'orange' : 'red',
      trend: assetEfficiency > 50 ? 'up' : 'down',
      insight: assetEfficiency > 50 ? 'Efficient asset use' : assetEfficiency > 25 ? 'Moderate efficiency' : 'Low efficiency'
    }
  ];

  // Colors for charts
  const assetColors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316'];
  const liabilityColors = ['#EF4444', '#F59E0B', '#8B5CF6', '#3B82F6', '#10B981', '#06B6D4', '#84CC16', '#F97316'];

  // Financial composition data for radial chart
  const compositionData = [
    {
      name: 'Assets',
      value: Math.abs(balanceSheet.totalAssets),
      fill: '#10B981'
    },
    {
      name: 'Liabilities',
      value: Math.abs(balanceSheet.totalLiabilities),
      fill: '#EF4444'
    }
  ];

  const renderCustomTooltip = (props: any) => {
    if (props.active && props.payload && props.payload.length) {
      const data = props.payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.fullName || data.name}</p>
          <p className="text-blue-600">{formatCurrency(data.value)}</p>
          {data.percentage && <p className="text-sm text-gray-600">{data.percentage.toFixed(1)}%</p>}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {keyMetrics.map((metric, index) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          
          return (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  metric.color === 'green' ? 'bg-green-100' : 
                  metric.color === 'red' ? 'bg-red-100' : 'bg-orange-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    metric.color === 'green' ? 'text-green-600' : 
                    metric.color === 'red' ? 'text-red-600' : 'text-orange-600'
                  }`} />
                </div>
                <TrendIcon className={`w-5 h-5 ${
                  metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
                }`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
                <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                <p className="text-xs text-gray-500 mb-1">{metric.description}</p>
                <p className={`text-xs font-medium ${
                  metric.color === 'green' ? 'text-green-600' : 
                  metric.color === 'red' ? 'text-red-600' : 'text-orange-600'
                }`}>{metric.insight}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets Composition Pie Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <PieChartIcon className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Asset Portfolio Analysis</h3>
              <p className="text-sm text-gray-600">Breakdown of company's asset allocation and investment distribution</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={assetsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => percentage > 5 ? `${name}: ${percentage.toFixed(1)}%` : ''}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {assetsData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={assetColors[index % assetColors.length]} />
                ))}
              </Pie>
              <Tooltip content={renderCustomTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Liabilities Composition Pie Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <PieChartIcon className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Liability Structure Analysis</h3>
              <p className="text-sm text-gray-600">Composition of debts, obligations and financial commitments</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={liabilitiesData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => percentage > 5 ? `${name}: ${percentage.toFixed(1)}%` : ''}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {liabilitiesData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={liabilityColors[index % liabilityColors.length]} />
                ))}
              </Pie>
              <Tooltip content={renderCustomTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Assets vs Liabilities Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Financial Position Comparison</h3>
            <p className="text-sm text-gray-600">Comparative analysis of major assets vs liabilities components</p>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={[
              ...assetsData.slice(0, 5).map(item => ({ ...item, type: 'Asset', value: item.value })),
              ...liabilitiesData.slice(0, 5).map(item => ({ ...item, type: 'Liability', value: -item.value }))
            ]}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={12}
            />
            <YAxis tickFormatter={(value) => formatCurrency(Math.abs(value))} />
            <Tooltip 
              content={renderCustomTooltip}
              formatter={(value) => [formatCurrency(Math.abs(value as number)), 'Amount']}
            />
            <Legend />
            <Bar 
              dataKey="value" 
              fill="#8884d8"
              name="Amount"
            >
              {[...assetsData.slice(0, 5), ...liabilitiesData.slice(0, 5)].map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={index < 5 ? '#10B981' : '#EF4444'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Financial Health Radial Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-lg border border-gray-200 p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <Activity className="w-6 h-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Financial Health Dashboard</h3>
            <p className="text-sm text-gray-600">Overall financial structure assessment and key performance indicators</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="80%" data={compositionData}>
              <RadialBar
                label={{ position: 'insideStart', fill: '#fff' }}
                background
                dataKey="value"
              />
              <Legend iconSize={18} wrapperStyle={{ top: '80%', left: '20%' }} />
              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
            </RadialBarChart>
          </ResponsiveContainer>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-green-900">Financial Strengths</h4>
              </div>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Total Assets: {formatCurrency(balanceSheet.totalAssets)}</li>
                <li>• Liquidity Ratio: {currentRatio.toFixed(2)} ({currentRatio > 1.5 ? 'Excellent' : currentRatio > 1 ? 'Good' : 'Needs Attention'})</li>
                <li>• Net Worth: {formatCurrency(balanceSheet.netWorth)}</li>
                <li>• Asset Efficiency: {assetEfficiency.toFixed(1)}%</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Business Insights</h4>
              </div>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Leverage Ratio: {(leverageRatio * 100).toFixed(1)}% ({leverageRatio < 0.4 ? 'Conservative' : leverageRatio < 0.6 ? 'Moderate' : 'Aggressive'})</li>
                <li>• Working Capital Management: {balanceSheet.netWorth > 0 ? 'Positive' : 'Requires Attention'}</li>
                <li>• Financial Structure: {currentRatio > 1 ? 'Stable' : 'Unstable'}</li>
              </ul>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <h4 className="font-medium text-orange-900">Areas for Improvement</h4>
              </div>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• {leverageRatio > 0.6 ? 'Consider reducing debt levels' : 'Monitor debt growth'}</li>
                <li>• {currentRatio < 1.5 ? 'Improve liquidity position' : 'Maintain current liquidity'}</li>
                <li>• {assetEfficiency < 50 ? 'Optimize asset utilization' : 'Continue efficient asset management'}</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Top Assets and Liabilities Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Assets */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 bg-green-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Top Assets Portfolio
            </h3>
            <p className="text-sm text-green-700 mt-1">Largest asset components by value</p>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assetsData.map((asset, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: assetColors[index % assetColors.length] }}
                        ></div>
                        {asset.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(asset.value)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {asset.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Top Liabilities */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          <div className="px-6 py-4 bg-red-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-600" />
              Top Liabilities Structure
            </h3>
            <p className="text-sm text-red-700 mt-1">Major financial obligations and debts</p>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Liability
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {liabilitiesData.map((liability, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: liabilityColors[index % liabilityColors.length] }}
                        ></div>
                        {liability.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(liability.value)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">
                      {liability.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsView;
