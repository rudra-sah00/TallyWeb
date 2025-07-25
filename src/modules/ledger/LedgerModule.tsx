import React, { useState, useEffect, useCallback } from 'react';
import { useDashboardContext } from '../../context/DashboardContext';
import LedgerList from './components/LedgerList';
import LedgerDetails from './components/LedgerDetails';
import { TallyLedger } from '../../services/api/ledger/ledgerApiService';
import LedgerApiService from '../../services/api/ledger/ledgerApiService';

interface LedgerModuleProps {
  serverUrl: string;
}

const LedgerModule: React.FC<LedgerModuleProps> = ({ serverUrl }) => {
  const { selectedCompany } = useDashboardContext();
  const [selectedLedger, setSelectedLedger] = useState<TallyLedger | null>(null);
  const [cachedLedgers, setCachedLedgers] = useState<TallyLedger[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  const ledgerApi = new LedgerApiService();

  // Set up API base URL when serverUrl changes
  useEffect(() => {
    if (serverUrl) {
      ledgerApi.setBaseURL(`http://${serverUrl}`);
    }
  }, [serverUrl]);

  // Fetch ledgers only once when component mounts or company changes
  useEffect(() => {
    if (selectedCompany && serverUrl && cachedLedgers.length === 0) {
      fetchLedgers();
    }
  }, [selectedCompany, serverUrl]);

  const fetchLedgers = useCallback(async () => {
    if (!selectedCompany) return;

    try {
      setIsInitialLoading(true);
      
      const ledgers = await ledgerApi.getLedgerList(selectedCompany);
      setCachedLedgers(ledgers);
      setLastFetchTime(Date.now());
      
    } catch (error) {
      console.error('Failed to fetch ledgers:', error);
      // Don't clear cache on error, keep existing data if available
    } finally {
      setIsInitialLoading(false);
    }
  }, [selectedCompany, ledgerApi]);

  const handleLedgerSelect = (ledger: TallyLedger) => {
    setSelectedLedger(ledger);
  };

  const handleBackToList = () => {
    setSelectedLedger(null);
  };

  const handleRefreshLedgers = () => {
    fetchLedgers();
  };

  if (!selectedCompany || !serverUrl) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="h-6 w-6 text-yellow-600 mr-3">⚠️</div>
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">Company Not Selected</h3>
              <p className="text-yellow-700">Please select a company to view ledger accounts.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {selectedLedger ? (
        <LedgerDetails
          ledger={selectedLedger}
          companyName={selectedCompany}
          serverUrl={serverUrl}
          onBack={handleBackToList}
        />
      ) : (
        <LedgerList
          cachedLedgers={cachedLedgers}
          isInitialLoading={isInitialLoading}
          onLedgerSelect={handleLedgerSelect}
          onRefresh={handleRefreshLedgers}
          lastFetchTime={lastFetchTime}
        />
      )}
    </div>
  );
};

export default LedgerModule;
