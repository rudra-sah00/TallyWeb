import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { generateDummyData, DashboardData } from '../utils/dummyData';
import DashboardApiService from '../services/api/dashboardApiService';

interface DashboardContextType {
  data: DashboardData;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  selectedCompany: string | null;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ 
  children: ReactNode; 
  selectedCompany: string;
  serverUrl: string | null;
}> = ({ 
  children, 
  selectedCompany,
  serverUrl
}) => {
  const [data, setData] = useState<DashboardData>(generateDummyData());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dashboardApi = new DashboardApiService();

  // Update API base URL when serverUrl changes
  React.useEffect(() => {
    if (serverUrl) {
      dashboardApi.setBaseURL(`http://${serverUrl}`);
    }
  }, [serverUrl]);

  const fetchFinancialOverview = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current month date range
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const fromDate = `${year}${month}01`; // First day of current month
      const toDate = `${year}${month}${String(now.getDate()).padStart(2, '0')}`; // Today

      // Fetch financial overview from Tally using targeted APIs
      const financialOverview = await dashboardApi.getFinancialOverview(
        fromDate,
        toDate,
        selectedCompany
      );

      // Update data with real financial overview while keeping dummy data for other sections
      setData(prevData => ({
        ...prevData,
        overview: financialOverview
      }));

    } catch (err) {
      console.error('Failed to fetch financial data from Tally:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data from Tally');
      
      // Keep using dummy data if API fails
      console.log('Falling back to dummy data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await fetchFinancialOverview();
  };

  useEffect(() => {
    // Fetch real data on component mount
    fetchFinancialOverview();
  }, []);

  return (
    <DashboardContext.Provider value={{ data, loading, error, refreshData, selectedCompany }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
};