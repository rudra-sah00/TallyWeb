import React, { useEffect, useRef } from 'react';
import { Chart, CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend } from 'chart.js';
import { useDashboardContext } from '../../../context/DashboardContext';

Chart.register(CategoryScale, LinearScale, BarElement, BarController, Title, Tooltip, Legend);

const StockLevels: React.FC = () => {
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
            labels: data.stock.itemLevels.map(item => item.name),
            datasets: [{
              label: 'Stock Quantity',
              data: data.stock.itemLevels.map(item => item.quantity),
              backgroundColor: data.stock.itemLevels.map(item => 
                item.quantity < 50 ? 'rgba(220, 38, 38, 0.8)' : 
                item.quantity < 100 ? 'rgba(217, 119, 6, 0.8)' : 
                'rgba(16, 163, 74, 0.8)'
              ),
              borderColor: data.stock.itemLevels.map(item => 
                item.quantity < 50 ? 'rgb(220, 38, 38)' : 
                item.quantity < 100 ? 'rgb(217, 119, 6)' : 
                'rgb(16, 163, 74)'
              ),
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              x: {
                beginAtZero: true
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
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Item-wise Stock Levels</h3>
        <div className="h-96">
          <canvas ref={chartRef}></canvas>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Stock Level Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-700">Item Name</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Current Stock</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Minimum Level</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Maximum Level</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.stock.itemLevels.map((item, index) => {
                const minLevel = Math.floor(item.quantity * 0.2);
                const maxLevel = Math.floor(item.quantity * 1.5);
                const status = item.quantity < 50 ? 'Critical' : item.quantity < 100 ? 'Low' : 'Normal';
                
                return (
                  <tr key={index} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-800">{item.name}</td>
                    <td className="px-4 py-3 text-center font-medium">{item.quantity}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{minLevel}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{maxLevel}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        status === 'Critical' ? 'bg-red-100 text-red-700' :
                        status === 'Low' ? 'bg-amber-100 text-amber-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockLevels;