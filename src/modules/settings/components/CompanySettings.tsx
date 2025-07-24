import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AppConfigService from '../../../services/config/appConfig';
import CompanyApiService, { TallyCompanyDetails, TallyCompanyTaxDetails } from '../../../services/api/company/companyApiService';
import Modal from '../../../shared/components/Modal';
import {
  Building2,
  MapPin,
  Mail,
  Calendar,
  Phone,
  CreditCard,
  Eye,
  RefreshCw,
  Globe
} from 'lucide-react';

const CompanySettings: React.FC = () => {
  const [currentCompany, setCurrentCompany] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState<TallyCompanyDetails | null>(null);
  const [taxDetails, setTaxDetails] = useState<TallyCompanyTaxDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const appConfig = AppConfigService.getInstance();
    const company = appConfig.getCurrentCompany();
    const config = appConfig.getConfig();
    
    setCurrentCompany(company);
    
    if (config?.serverAddress && config?.serverPort) {
      setServerUrl(`${config.serverAddress}:${config.serverPort}`);
    }
  }, []);

  const fetchCompanyDetails = async () => {
    if (!currentCompany || !serverUrl) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const companyApi = new CompanyApiService();
      companyApi.setBaseURL(`http://${serverUrl}`);
      
      // Fetch both basic details and tax details
      const [details, taxData] = await Promise.all([
        companyApi.getCompanyDetails(currentCompany),
        companyApi.getCompanyTaxDetails(currentCompany)
      ]);
      
      setCompanyDetails(details);
      setTaxDetails(taxData);
      setShowDetailsModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch company details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Company
          </label>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {currentCompany ? (
                <p className="text-gray-900 font-semibold bg-blue-50 px-3 py-2 rounded border">
                  {currentCompany}
                </p>
              ) : (
                <p className="text-gray-500 italic">
                  No company selected. Please select a company from the company selection page.
                </p>
              )}
            </div>
            {currentCompany && serverUrl && (
              <button
                onClick={fetchCompanyDetails}
                disabled={loading}
                className="ml-3 inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Company Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title={`Company Details - ${companyDetails?.name || 'Unknown'}`}
          size="xl"
        >
          {companyDetails && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Building2 className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <span className="font-medium text-gray-600 block">Company Name</span>
                      <p className="text-gray-900 mt-1">{companyDetails.name}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Mail className="h-5 w-5 text-green-600 mt-1" />
                    <div>
                      <span className="font-medium text-gray-600 block">Email</span>
                      <p className="text-gray-900 mt-1">{companyDetails.email || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-purple-600 mt-1" />
                    <div>
                      <span className="font-medium text-gray-600 block">Phone</span>
                      <p className="text-gray-900 mt-1">{companyDetails.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  {taxDetails && (
                    <div className="flex items-start space-x-3">
                      <CreditCard className="h-5 w-5 text-orange-600 mt-1" />
                      <div>
                        <span className="font-medium text-gray-600 block">PAN Number</span>
                        <p className="text-gray-900 mt-1 font-mono bg-orange-50 px-2 py-1 rounded border">
                          {taxDetails.incometaxnumber || 'Not provided'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <span className="font-medium text-gray-600 block">Books From</span>
                      <p className="text-gray-900 mt-1">{companyDetails.booksFrom}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Globe className="h-5 w-5 text-green-600 mt-1" />
                    <div>
                      <span className="font-medium text-gray-600 block">State</span>
                      <p className="text-gray-900 mt-1">{companyDetails.stateName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Globe className="h-5 w-5 text-purple-600 mt-1" />
                    <div>
                      <span className="font-medium text-gray-600 block">Country</span>
                      <p className="text-gray-900 mt-1">{companyDetails.countryName}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-orange-600 mt-1" />
                    <div>
                      <span className="font-medium text-gray-600 block">Pincode</span>
                      <p className="text-gray-900 mt-1">{companyDetails.pincode}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-600 mt-1" />
                    <div>
                      <span className="font-medium text-gray-600 block">GUID</span>
                      <p className="text-gray-900 mt-1 font-mono text-xs">{companyDetails.guid}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {companyDetails.mailingName && companyDetails.mailingName.length > 0 && (
                <div className="border-t pt-4">
                  <span className="font-medium text-gray-600 block mb-3">Mailing Names</span>
                  <div className="space-y-2">
                    {companyDetails.mailingName.map((name, index) => (
                      <p key={index} className="text-gray-900 bg-gray-50 px-3 py-2 rounded border">{name}</p>
                    ))}
                  </div>
                </div>
              )}
              
              {companyDetails.address && companyDetails.address.length > 0 && (
                <div className="border-t pt-4">
                  <span className="font-medium text-gray-600 block mb-3">Address</span>
                  <div className="bg-gray-50 px-3 py-2 rounded border">
                    {companyDetails.address.map((addr, index) => (
                      <p key={index} className="text-gray-900">{addr}</p>
                    ))}
                  </div>
                </div>
              )}
              
            </div>
          )}
        </Modal>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Connected Server
          </label>
          {serverUrl ? (
            <p className="text-gray-900 font-mono bg-green-50 px-3 py-2 rounded border">
              {serverUrl}
            </p>
          ) : (
            <p className="text-gray-500 italic">
              No server configured. Please configure server settings.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Configuration Status
          </label>
          <div className="space-y-2">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${serverUrl ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                Server: {serverUrl ? 'Connected' : 'Not configured'}
              </span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${currentCompany ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                Company: {currentCompany ? 'Selected' : 'Not selected'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-md">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Current Session Details</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Server: {serverUrl || 'Not configured'}</li>
            <li>• Company: {currentCompany || 'Not selected'}</li>
            <li>• All settings are saved locally in your browser</li>
          </ul>
        </div>

        {(!currentCompany || !serverUrl) && (
          <div className="text-center py-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800 mb-3">
              To access all features, please complete the initial setup by visiting the company selection page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              Reconfigure Setup
            </button>
          </div>
        )}

        {currentCompany && serverUrl && (
          <div className="text-center py-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800 mb-3">
              ✅ Setup Complete! All features are available.
            </p>
            <button
              onClick={() => {
                const appConfig = AppConfigService.getInstance();
                appConfig.resetConfig();
                window.location.reload();
              }}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Change Configuration
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CompanySettings;
