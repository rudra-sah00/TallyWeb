import React, { useEffect, useRef } from 'react';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, BarController } from 'chart.js';
import { useDashboardContext } from '../../../context/DashboardContext';
import { formatCurrency } from '../../../shared/utils/formatters';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, BarController);

const PurchaseAnalytics: React.FC = () => {
  const { data } = useDashboardContext();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.purchases.monthlyTrend.labels,
            datasets: [{
              label: 'Purchase Amount',
              data: data.purchases.monthlyTrend.data,
              backgroundColor: 'rgba(16, 163, 74, 0.8)',
              borderColor: 'rgb(16, 163, 74)',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return '₹' + (Number(value) / 100000).toFixed(0) + 'L';
                  }
                }
              }
            }
          }
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Monthly Purchase Trend</h3>
          <div className="h-64">
            <canvas ref={chartRef}></canvas>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Supplier Performance</h3>
          <div className="space-y-3">
            {data.purchases.topSuppliers.map((supplier, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-800">{supplier.name}</span>
                  <p className="text-sm text-gray-600">Reliability: {85 + Math.floor(Math.random() * 15)}%</p>
                </div>
                <span className="font-bold text-green-600">{formatCurrency(supplier.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Purchase Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-700 mb-2">Cost Savings</h4>
            <p className="text-2xl font-bold text-blue-800">₹2.4L</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <h4 className="text-sm font-medium text-green-700 mb-2">On-Time Delivery</h4>
            <p className="text-2xl font-bold text-green-800">92.3%</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <h4 className="text-sm font-medium text-purple-700 mb-2">Quality Score</h4>
            <p className="text-2xl font-bold text-purple-800">4.7/5</p>
          </div>
          <div className="text-center p-4 bg-amber-50 rounded-lg">
            <h4 className="text-sm font-medium text-amber-700 mb-2">Lead Time</h4>
            <p className="text-2xl font-bold text-amber-800">5.2 days</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseAnalytics;