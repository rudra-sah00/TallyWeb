import React, { useState, useEffect } from 'react'; 
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './shared/components/Sidebar';
import Dashboard from './modules/dashboard/Dashboard';
import SalesModule from './modules/sales/SalesModule';
import PurchasesModule from './modules/purchases/PurchasesModule';
import InventoryModule from './modules/inventory/InventoryModule';
import LedgerModule from './modules/ledger/LedgerModule';
import CompanyModule from './modules/company/CompanyModule';
import SettingsModule from './modules/settings/SettingsModule';
import { DashboardProvider } from './context/DashboardContext';
import CompanySelection from './components/CompanySelection';
import AppConfigService from './services/config/appConfig';

// Placeholder components for unimplemented modules
const PlaceholderModule: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="p-6">
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
      <p className="text-gray-600 mt-2">{description}</p>
    </div>
    <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
      <div className="max-w-md mx-auto">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Coming Soon</h3>
        <p className="text-gray-600">
          This module is under development and will be available in a future update.
        </p>
      </div>
    </div>
  </div>
);

function App() {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if user has already configured server and company
    const appConfig = AppConfigService.getInstance();
    const config = appConfig.getConfig();
    const company = appConfig.getCurrentCompany();
    
    if (config?.serverAddress && config?.serverPort && company) {
      setSelectedCompany(company);
      setServerUrl(`${config.serverAddress}:${config.serverPort}`);
      
      // Redirect to dashboard if user is on onboarding but already configured
      if (location.pathname === '/onboarding' || location.pathname === '/') {
        navigate('/dashboard', { replace: true });
      }
    } else {
      // Redirect to onboarding if not configured and not already there
      if (location.pathname !== '/onboarding' && location.pathname !== '/') {
        navigate('/onboarding', { replace: true });
      }
    }
    setIsLoading(false);
  }, [navigate, location.pathname]);

  const handleViewChange = (view: string) => {
    navigate(`/${view}`);
  };

  const handleLogout = () => {
    // Clear all configuration
    const appConfig = AppConfigService.getInstance();
    appConfig.resetConfig();
    
    // Reset component state
    setSelectedCompany(null);
    setServerUrl(null);
    navigate('/onboarding');
  };

  const handleCompanySelect = (company: string, server: string) => {
    // Parse server URL to get address and port
    const [address, port] = server.includes(':') ? server.split(':') : [server, '9000'];
    
    // Save to AppConfigService
    const appConfig = AppConfigService.getInstance();
    appConfig.updateConfig({
      serverAddress: address,
      serverPort: parseInt(port, 10),
    });
    appConfig.setCurrentCompany(company);
    
    setSelectedCompany(company);
    setServerUrl(server);
    
    // Navigate to dashboard after successful selection
    navigate('/dashboard');
  };

  // Get current view from URL path
  const getCurrentView = () => {
    const path = location.pathname;
    if (path.startsWith('/settings')) return 'settings';
    return path.slice(1) || 'dashboard';
  };

  // Show loading state while checking configuration
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Onboarding Route */}
      <Route path="/onboarding" element={<CompanySelection onCompanySelect={handleCompanySelect} />} />
      
      {/* Protected App Routes */}
      <Route path="/*" element={
        selectedCompany ? (
          <DashboardProvider selectedCompany={selectedCompany} serverUrl={serverUrl}>
            <div className="min-h-screen bg-gray-50 flex">
              <Sidebar currentView={getCurrentView()} onViewChange={handleViewChange} onLogout={handleLogout} />
              <main className="flex-1 transition-all duration-300 ml-0 lg:ml-16">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/sales" element={<SalesModule />} />
                  <Route path="/purchases" element={<PurchasesModule />} />
                  <Route path="/inventory" element={<InventoryModule />} />
                  <Route path="/expenses" element={<PlaceholderModule title="Expenses" description="Track and manage your business expenses" />} />
                  <Route path="/reports" element={<PlaceholderModule title="Reports" description="Generate comprehensive financial reports" />} />
                  <Route path="/gst" element={<PlaceholderModule title="GST Management" description="Handle GST calculations and filings" />} />
                  <Route path="/ledger" element={<LedgerModule serverUrl={serverUrl || ''} />} />
                  <Route path="/company" element={<CompanyModule />} />
                  <Route path="/settings/*" element={<SettingsModule />} />
                </Routes>
              </main>
            </div>
          </DashboardProvider>
        ) : (
          <Navigate to="/onboarding" replace />
        )
      } />
    </Routes>
  );
}

export default App;