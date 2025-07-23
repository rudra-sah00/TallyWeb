import React, { useEffect, useRef } from 'react';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, LineController, PieController } from 'chart.js';
import { useDashboardContext } from '../../../context/DashboardContext';
import { formatCurrency } from '../../../shared/utils/formatters';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, LineController, PieController);

const SalesAnalytics: React.FC = () => {
  const { data } = useDashboardContext();
  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const lineChartInstance = useRef<Chart | null>(null);
  const pieChartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (lineChartRef.current && pieChartRef.current) {
      // Destroy existing charts
      if (lineChartInstance.current) {
        lineChartInstance.current.destroy();
        lineChartInstance.current = null;
      }
      if (pieChartInstance.current) {
        pieChartInstance.current.destroy();
        pieChartInstance.current = null;
      }

      // Line chart for monthly sales
      const lineCtx = lineChartRef.current.getContext('2d');
      if (lineCtx) {
        lineChartInstance.current = new Chart(lineCtx, {
          type: 'line',
          data: {
            labels: data.sales.monthlyTrend.labels,
            datasets: [{
              label: 'Sales Amount',
              data: data.sales.monthlyTrend.data,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.4,
              fill: true
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

      // Pie chart for top customers
      const pieCtx = pieChartRef.current.getContext('2d');
      if (pieCtx) {
        pieChartInstance.current = new Chart(pieCtx, {
          type: 'pie',
          data: {
            labels: data.sales.topCustomers.map(c => c.name),
            datasets: [{
              data: data.sales.topCustomers.map(c => c.amount),
              backgroundColor: [
                'rgb(59, 130, 246)',
                'rgb(16, 163, 74)',
                'rgb(217, 119, 6)',
                'rgb(220, 38, 38)',
                'rgb(147, 51, 234)'
              ]
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return context.label + ': ' + formatCurrency(Number(context.raw));
                  }
                }
              }
            }
          }
        });
      }
    }

    return () => {
      if (lineChartInstance.current) {
        lineChartInstance.current.destroy();
        lineChartInstance.current = null;
      }
      if (pieChartInstance.current) {
        pieChartInstance.current.destroy();
        pieChartInstance.current = null;
      }
    };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Monthly Sales Trend</h3>
          <div className="h-64">
            <canvas ref={lineChartRef}></canvas>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Customer Revenue Distribution</h3>
          <div className="h-64">
            <canvas ref={pieChartRef}></canvas>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Sales Performance Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-700 mb-2">Monthly Growth</h4>
            <p className="text-2xl font-bold text-blue-800">+12.5%</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <h4 className="text-sm font-medium text-green-700 mb-2">Conversion Rate</h4>
            <p className="text-2xl font-bold text-green-800">68.2%</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <h4 className="text-sm font-medium text-purple-700 mb-2">Customer Retention</h4>
            <p className="text-2xl font-bold text-purple-800">85.4%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalytics;