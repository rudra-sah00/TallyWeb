import React, { useState } from 'react';
import { Building2, Server, ArrowRight, RefreshCw, AlertCircle, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CompanyApiService, { TallyCompany } from '../services/api/company/companyApiService';

interface CompanySelectionProps {
  onCompanySelect: (company: string, serverUrl: string) => void;
}

const CompanySelection: React.FC<CompanySelectionProps> = ({ onCompanySelect }) => {
  const [step, setStep] = useState<'server' | 'company'>('server');
  const [serverUrl, setServerUrl] = useState<string>('localhost:9000');
  const [customServer, setCustomServer] = useState<string>('');
  const [selectedServerType, setSelectedServerType] = useState<'preset' | 'custom'>('preset');
  const [companies, setCompanies] = useState<TallyCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyApi = new CompanyApiService();

  const getCurrentServerUrl = () => {
    if (selectedServerType === 'custom') {
      return customServer;
    }
    return serverUrl;
  };

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Update the base URL in the API service
      const currentServer = getCurrentServerUrl();
      companyApi.setBaseURL(`http://${currentServer}`);
      
      const companyList = await companyApi.getCompanyList();
      setCompanies(companyList);
      
      if (companyList.length === 0) {
        setError('No companies found. Please ensure Tally is running and accessible.');
      } else {
        setStep('company');
      }
    } catch (err) {
      let errorMessage = 'Failed to connect to Tally server';
      
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('CORS')) {
          errorMessage = `🔒 CORS Error: Cannot connect to ${getCurrentServerUrl()}

The server is reachable (verified by curl test), but browsers block cross-origin requests due to security policy.

✅ Server Status: Online and responding
❌ Browser Access: Blocked by CORS policy

💡 Solutions:
• Configure Tally to allow CORS requests
• Use a local proxy server
• Access from same network/domain
• Use Tally Gateway with CORS enabled

Note: curl works but browser requests are blocked.`;
        } else if (err.message.includes('timeout')) {
          errorMessage = `⏱️ Connection Timeout: ${getCurrentServerUrl()}

The request timed out after 5 seconds.

💡 Check:
• Network connectivity to ${getCurrentServerUrl()}
• Server response time
• Firewall settings
• Tally server load`;
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleServerProceed = () => {
    const currentServer = getCurrentServerUrl();
    if (currentServer) {
      fetchCompanies();
    }
  };

  const handleCompanyProceed = () => {
    if (selectedCompany) {
      onCompanySelect(selectedCompany, getCurrentServerUrl());
    }
  };

  const handleBackToServer = () => {
    setStep('server');
    setCompanies([]);
    setSelectedCompany('');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 w-full max-w-2xl overflow-hidden"
      >
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <motion.div 
              className={`p-4 rounded-xl mr-4 transition-all duration-300 ${step === 'server' ? 'bg-blue-100 shadow-lg' : 'bg-gray-100'}`}
              animate={{ 
                backgroundColor: step === 'server' ? '#dbeafe' : '#f3f4f6',
                scale: step === 'server' ? 1.1 : 1,
                boxShadow: step === 'server' ? '0 10px 25px -5px rgba(59, 130, 246, 0.3)' : 'none'
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Server className={`h-7 w-7 transition-colors duration-300 ${step === 'server' ? 'text-blue-600' : 'text-gray-400'}`} />
            </motion.div>
            <motion.div 
              className="h-1 w-12 rounded-full bg-gray-200 mx-2"
              animate={{ 
                backgroundColor: step === 'company' ? '#3b82f6' : '#e5e7eb'
              }}
              transition={{ duration: 0.4 }}
            />
            <motion.div 
              className={`p-4 rounded-xl ml-4 transition-all duration-300 ${step === 'company' ? 'bg-blue-100 shadow-lg' : 'bg-gray-100'}`}
              animate={{ 
                backgroundColor: step === 'company' ? '#dbeafe' : '#f3f4f6',
                scale: step === 'company' ? 1.1 : 1,
                boxShadow: step === 'company' ? '0 10px 25px -5px rgba(59, 130, 246, 0.3)' : 'none'
              }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Building2 className={`h-7 w-7 transition-colors duration-300 ${step === 'company' ? 'text-blue-600' : 'text-gray-400'}`} />
            </motion.div>
          </div>
          <motion.h1 
            className="text-3xl font-bold text-gray-900 mb-3"
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            Tally Dashboard
          </motion.h1>
          <motion.p 
            className="text-gray-600 text-lg"
            key={`${step}-desc`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {step === 'server' ? 'Configure your Tally server connection' : 'Select your company to begin accessing your financial dashboard'}
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'server' && (
            <motion.div
              key="server-step"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Server Selection */}
              <div className="mb-8">
                <label className="block text-sm font-semibold text-gray-700 mb-6">
                  Select Tally Server
                </label>
                
                {/* Preset Server Options */}
                <div className="space-y-4 mb-6">
                  <motion.div
                    whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                    whileTap={{ scale: 0.99 }}
                    className={`relative p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden ${
                      selectedServerType === 'preset' && serverUrl === 'localhost:9000'
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                    }`}
                    onClick={() => {
                      setSelectedServerType('preset');
                      setServerUrl('localhost:9000');
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg mr-4 transition-colors duration-300 ${
                          selectedServerType === 'preset' && serverUrl === 'localhost:9000'
                            ? 'bg-blue-100'
                            : 'bg-gray-100'
                        }`}>
                          <Monitor className={`h-5 w-5 transition-colors duration-300 ${
                            selectedServerType === 'preset' && serverUrl === 'localhost:9000'
                              ? 'text-blue-600'
                              : 'text-gray-500'
                          }`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 text-base">Local Server</h3>
                          <p className="text-sm text-gray-500">localhost:9000</p>
                        </div>
                      </div>
                      <motion.div 
                        className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${
                          selectedServerType === 'preset' && serverUrl === 'localhost:9000'
                            ? 'border-blue-500 bg-blue-500 shadow-lg'
                            : 'border-gray-300'
                        }`}
                        animate={{ scale: selectedServerType === 'preset' && serverUrl === 'localhost:9000' ? 1 : 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        {selectedServerType === 'preset' && serverUrl === 'localhost:9000' && (
                          <motion.div 
                            className="w-full h-full rounded-full bg-white flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                          </motion.div>
                        )}
                      </motion.div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
                    whileTap={{ scale: 0.99 }}
                    className={`relative p-5 border-2 rounded-xl cursor-pointer transition-all duration-300 overflow-hidden ${
                      selectedServerType === 'custom'
                        ? 'border-blue-500 bg-blue-50 shadow-lg'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                    }`}
                    onClick={() => setSelectedServerType('custom')}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1 min-w-0">
                        <div className={`p-2 rounded-lg mr-4 mt-0.5 flex-shrink-0 transition-colors duration-300 ${
                          selectedServerType === 'custom'
                            ? 'bg-blue-100'
                            : 'bg-gray-100'
                        }`}>
                          <Server className={`h-5 w-5 transition-colors duration-300 ${
                            selectedServerType === 'custom'
                              ? 'text-blue-600'
                              : 'text-gray-500'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 mb-2 text-base">Custom Server</h3>
                          <AnimatePresence>
                            {selectedServerType === 'custom' && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3, ease: "easeOut" }}
                                className="overflow-hidden"
                              >
                                <input
                                  type="text"
                                  placeholder="Enter IP address or hostname (e.g., 192.168.1.100:9000)"
                                  value={customServer}
                                  onChange={(e) => setCustomServer(e.target.value)}
                                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <motion.div 
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ml-4 mt-0.5 transition-all duration-300 ${
                          selectedServerType === 'custom'
                            ? 'border-blue-500 bg-blue-500 shadow-lg'
                            : 'border-gray-300'
                        }`}
                        animate={{ scale: selectedServerType === 'custom' ? 1 : 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        {selectedServerType === 'custom' && (
                          <motion.div 
                            className="w-full h-full rounded-full bg-white flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                          </motion.div>
                        )}
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Server Connection */}
              <div className="flex justify-end">
                <motion.button
                  whileHover={{ y: -1, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleServerProceed}
                  disabled={loading || (selectedServerType === 'custom' && !customServer.trim())}
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-all duration-200 shadow-lg"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      Fetch Companies
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 'company' && (
            <motion.div
              key="company-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Server Status */}
              <motion.div 
                className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 mb-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <Server className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-sm font-semibold text-green-800">Connected to Server</span>
                  </div>
                  <div className="flex items-center">
                    <motion.div 
                      className="h-2.5 w-2.5 bg-green-500 rounded-full mr-3"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    />
                    <span className="text-sm font-medium text-green-700">{getCurrentServerUrl()}</span>
                    <motion.button
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleBackToServer}
                      className="ml-4 px-3 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-colors duration-200"
                    >
                      Change
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              {/* Company Selection */}
              <motion.div 
                className="mb-8"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <label className="block text-sm font-semibold text-gray-700">
                    Available Companies
                  </label>
                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={fetchCompanies}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 transition-all duration-200"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                  </motion.button>
                </div>

                <AnimatePresence>
                  {companies.length > 0 && (
                    <motion.div 
                      className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {companies.map((company, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            selectedCompany === company.name
                              ? 'border-blue-500 bg-blue-50 shadow-lg'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                          }`}
                          onClick={() => setSelectedCompany(company.name)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 text-base mb-1">{company.name}</h3>
                              {company.startFrom && company.endTo && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Financial Year: {company.startFrom} to {company.endTo}
                                </p>
                              )}
                            </div>
                            <motion.div 
                              className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${
                                selectedCompany === company.name
                                  ? 'border-blue-500 bg-blue-500 shadow-lg'
                                  : 'border-gray-300'
                              }`}
                              animate={{ scale: selectedCompany === company.name ? 1 : 0.9 }}
                              transition={{ duration: 0.2 }}
                            >
                              {selectedCompany === company.name && (
                                <motion.div 
                                  className="w-full h-full rounded-full bg-white flex items-center justify-center"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                </motion.div>
                              )}
                            </motion.div>
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Company Proceed Button */}
              <motion.div 
                className="flex justify-between items-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.button
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBackToServer}
                  className="inline-flex items-center px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                >
                  ← Back to Server
                </motion.button>
                <motion.button
                  whileHover={{ y: -1, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCompanyProceed}
                  disabled={!selectedCompany || loading}
                  className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-all duration-200 shadow-lg"
                >
                  Proceed to Dashboard
                  <ArrowRight className="h-5 w-5 ml-2" />
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div 
              className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-5 mt-6"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start">
                <div className="p-2 bg-red-100 rounded-lg mr-4 flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800 mb-1">Connection Error</h3>
                  <div className="text-sm text-red-700 whitespace-pre-line leading-relaxed">{error}</div>
                </div>
              </div>
              <motion.button
                whileHover={{ y: -1, boxShadow: "0 8px 25px -5px rgba(239, 68, 68, 0.4)" }}
                whileTap={{ scale: 0.98 }}
                onClick={step === 'server' ? handleServerProceed : fetchCompanies}
                className="mt-4 inline-flex items-center px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 text-sm font-medium transition-all duration-200 shadow-lg"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default CompanySelection;
