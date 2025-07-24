import React, { useMemo } from 'react';
import { SalesVoucher } from '../../../services/api/sales/salesApiService';
import { formatCurrency } from '../../../shared/utils/formatters';
import { BarChart3, DollarSign, Users, Target } from 'lucide-react';

interface SalesAnalyticsProps {
  salesVouchers: SalesVoucher[];
  currentRangeLabel: string;
  loading: boolean;
}

interface DailySales {
  date: string;
  amount: number;
  vouchers: number;
}

interface MonthlySales {
  month: string;
  amount: number;
  vouchers: number;
}

export const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({
  salesVouchers,
  loading
}) => {
  const analytics = useMemo(() => {
    if (!salesVouchers.length) return null;

    // Financial year starts from April 1st in India
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-indexed (0=Jan, 3=Apr)
    
    // Determine financial year
    let fyStartYear, fyEndYear;
    if (currentMonth >= 3) { // April onwards (months 3-11)
      fyStartYear = currentYear;
      fyEndYear = currentYear + 1;
    } else { // January to March (months 0-2)
      fyStartYear = currentYear - 1;
      fyEndYear = currentYear;
    }
    
    // Create all months of current financial year up to current month
    const allMonthsData: MonthlySales[] = [];
    
    // Add months from April of FY start year to March of FY end year
    for (let i = 0; i < 12; i++) {
      const monthIndex = (3 + i) % 12; // Start from April (index 3)
      const year = monthIndex < 3 ? fyEndYear : fyStartYear; // Jan-Mar are in next calendar year
      const monthDate = new Date(year, monthIndex);
      
      // Only include months up to current month
      if (monthDate <= currentDate) {
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'long' });
        const shortYear = year.toString().slice(-2);
        allMonthsData.push({
          month: `${monthName} '${shortYear}`,
          amount: 0,
          vouchers: 0
        });
      }
    }

    // Populate with actual sales data
    salesVouchers.forEach(voucher => {
      const [, month, year] = voucher.date.split('/');
      const voucherYear = parseInt(year);
      const voucherMonth = parseInt(month) - 1; // Convert to 0-indexed
      
      // Check if this voucher falls within current financial year
      const voucherDate = new Date(voucherYear, voucherMonth);
      const fyStart = new Date(fyStartYear, 3); // April 1st of FY start year
      const fyEnd = new Date(fyEndYear, 2, 31); // March 31st of FY end year
      
      if (voucherDate >= fyStart && voucherDate <= fyEnd && voucherDate <= currentDate) {
        const monthName = voucherDate.toLocaleDateString('en-US', { month: 'long' });
        const shortYear = voucherYear.toString().slice(-2);
        const monthLabel = `${monthName} '${shortYear}`;
        
        const existingMonth = allMonthsData.find(m => m.month === monthLabel);
        if (existingMonth) {
          existingMonth.amount += voucher.amount;
          existingMonth.vouchers += 1;
        }
      }
    });

    // Daily sales aggregation (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentVouchers = salesVouchers.filter(voucher => {
      const [day, month, year] = voucher.date.split('/');
      const voucherDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return voucherDate >= thirtyDaysAgo;
    });

    const dailySalesMap = recentVouchers.reduce((acc, voucher) => {
      const date = voucher.date;
      if (!acc[date]) {
        acc[date] = { date, amount: 0, vouchers: 0 };
      }
      acc[date].amount += voucher.amount;
      acc[date].vouchers += 1;
      return acc;
    }, {} as Record<string, DailySales>);

    const dailySales = Object.values(dailySalesMap).sort((a, b) => 
      new Date(a.date.split('/').reverse().join('-')).getTime() - 
      new Date(b.date.split('/').reverse().join('-')).getTime()
    );

    // Customer analysis
    const customerSales = salesVouchers.reduce((acc, voucher) => {
      acc[voucher.partyName] = (acc[voucher.partyName] || 0) + voucher.amount;
      return acc;
    }, {} as Record<string, number>);

    const topCustomers = Object.entries(customerSales)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    // Calculate trends
    const totalSales = salesVouchers.reduce((sum, v) => sum + v.amount, 0);
    const totalVouchers = salesVouchers.length;
    const uniqueCustomers = new Set(salesVouchers.map(v => v.partyName)).size;

    // Sales growth (comparing first half vs second half of period)
    const midPoint = Math.floor(dailySales.length / 2);
    const firstHalfSales = dailySales.slice(0, midPoint).reduce((sum, day) => sum + day.amount, 0);
    const secondHalfSales = dailySales.slice(midPoint).reduce((sum, day) => sum + day.amount, 0);
    const growthRate = firstHalfSales > 0 ? ((secondHalfSales - firstHalfSales) / firstHalfSales) * 100 : 0;

    return {
      dailySales,
      monthlySales: allMonthsData,
      topCustomers,
      totalSales,
      totalVouchers,
      uniqueCustomers,
      growthRate,
      financialYear: `FY ${fyStartYear}-${fyEndYear.toString().slice(-2)}`
    };
  }, [salesVouchers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
          <span className="text-lg text-gray-600">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
        <p className="text-gray-600">No sales data available for analysis.</p>
      </div>
    );
  }

  const maxDailySales = Math.max(...analytics.dailySales.map(d => d.amount));
  const maxMonthlySales = Math.max(...analytics.monthlySales.map(m => m.amount));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Total Revenue</p>
              <p className="text-2xl font-bold">{formatCurrency(analytics.totalSales)}</p>
              <p className="text-emerald-200 text-xs mt-1">{analytics.financialYear} Financial Year</p>
            </div>
            <DollarSign className="h-8 w-8 text-emerald-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Total Orders</p>
              <p className="text-2xl font-bold">{analytics.totalVouchers}</p>
              <p className="text-indigo-200 text-xs mt-1">Sales Transactions</p>
            </div>
            <Target className="h-8 w-8 text-indigo-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-violet-100 text-sm font-medium">Unique Customers</p>
              <p className="text-2xl font-bold">{analytics.uniqueCustomers}</p>
              <p className="text-violet-200 text-xs mt-1">Active Buyers</p>
            </div>
            <Users className="h-8 w-8 text-violet-200" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Daily Sales (Last 30 Days)</h3>
          <div className="space-y-3">
            {analytics.dailySales.slice(-10).map((day) => (
              <div key={day.date} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600 w-16 font-medium">{day.date}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 min-w-[100px]">
                    <div
                      className="bg-gradient-to-r from-indigo-400 to-indigo-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${maxDailySales > 0 ? (day.amount / maxDailySales) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(day.amount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {day.vouchers} orders
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Sales Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">{analytics.financialYear} Monthly Sales Overview</h3>
          <div className="space-y-3">
            {analytics.monthlySales.map((month) => (
              <div key={month.month} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600 w-20 font-medium">{month.month}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-3 min-w-[100px]">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${maxMonthlySales > 0 ? (month.amount / maxMonthlySales) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(month.amount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {month.vouchers} orders
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Customers Analysis */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Customers Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">Top 5 by Revenue</h4>
            <div className="space-y-3">
              {analytics.topCustomers.slice(0, 5).map(([customer, amount], index) => (
                <div key={customer} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 text-xs font-bold rounded-full">
                      {index + 1}
                    </div>
                    <span className="text-sm text-gray-900 truncate max-w-[150px]" title={customer}>
                      {customer}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(amount)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {((amount / analytics.totalSales) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">Customer Distribution</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Customers</span>
                <span className="text-sm font-medium">{analytics.uniqueCustomers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg Revenue per Customer</span>
                <span className="text-sm font-medium">
                  {formatCurrency(analytics.totalSales / analytics.uniqueCustomers)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Avg Orders per Customer</span>
                <span className="text-sm font-medium">
                  {(analytics.totalVouchers / analytics.uniqueCustomers).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Top Customer Share</span>
                <span className="text-sm font-medium">
                  {analytics.topCustomers.length > 0 
                    ? ((analytics.topCustomers[0][1] / analytics.totalSales) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalytics;
