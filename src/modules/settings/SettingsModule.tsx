import React from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, Server, Building2, HelpCircle, ArrowLeft, Phone, Mail, Book, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import ServerSettings from './components/ServerSettings';
import CompanySettings from './components/CompanySettings';

interface SettingsOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
}

const SettingsModule: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const settingsOptions: SettingsOption[] = [
    {
      id: 'server',
      title: 'Server Configuration',
      description: 'Configure your Tally server connection settings',
      icon: <Server className="h-6 w-6" />,
      path: '/settings/server'
    },
    {
      id: 'company',
      title: 'Company Management',
      description: 'View and manage company information and details',
      icon: <Building2 className="h-6 w-6" />,
      path: '/settings/company'
    },
    {
      id: 'help',
      title: 'Help & Support',
      description: 'Get help, documentation, and support resources',
      icon: <HelpCircle className="h-6 w-6" />,
      path: '/settings/help'
    }
  ];

  const getCurrentSettingTitle = () => {
    const path = location.pathname;
    const option = settingsOptions.find(opt => opt.path === path);
    return option?.title || 'Settings';
  };

  const getCurrentSettingDescription = () => {
    const path = location.pathname;
    const option = settingsOptions.find(opt => opt.path === path);
    return option?.description || 'Manage your application configuration and preferences.';
  };

  const isSubRoute = location.pathname !== '/settings';

  // Settings Overview Component
  const SettingsOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      {settingsOptions.map((option) => (
        <motion.div
          key={option.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 cursor-pointer hover:shadow-lg transition-all duration-200"
          onClick={() => navigate(option.path)}
        >
          <div className="flex items-center mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-md">
              {option.icon}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 ml-4">{option.title}</h3>
          </div>
          <p className="text-gray-600 leading-relaxed">{option.description}</p>
        </motion.div>
      ))}
    </div>
  );

  // Help & Support Component
  const HelpSupport = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Contact Information */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center mb-6">
          <Phone className="h-6 w-6 text-blue-600 mr-3" />
          <h2 className="text-2xl font-semibold text-gray-900">Contact Support</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Phone className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="font-semibold text-blue-900">Phone Support</h3>
            </div>
            <p className="text-2xl font-bold text-blue-600 mb-2">8093423855</p>
            <p className="text-sm text-blue-700">Available 9 AM - 6 PM (Mon-Fri)</p>
          </div>
          <div className="bg-green-50 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Mail className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="font-semibold text-green-900">Email Support</h3>
            </div>
            <p className="text-lg font-semibold text-green-600 mb-2">support@tallyapp.com</p>
            <p className="text-sm text-green-700">Response within 24 hours</p>
          </div>
        </div>
      </div>

      {/* Tally Prime ODBC Setup */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center mb-6">
          <Book className="h-6 w-6 text-purple-600 mr-3" />
          <h2 className="text-2xl font-semibold text-gray-900">Tally Prime ODBC Setup</h2>
        </div>
        
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-2" />
              <h3 className="font-semibold text-amber-800">Important Requirements</h3>
            </div>
            <p className="text-amber-700 text-sm">
              Ensure Tally Prime is running and ODBC is enabled before proceeding with the setup.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              Step-by-Step Instructions:
            </h3>
            
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  title: "Enable ODBC in Tally Prime",
                  description: "Go to Gateway of Tally → F11 (Features) → Set 'Use ODBC' to Yes"
                },
                {
                  step: "2", 
                  title: "Configure ODBC Port",
                  description: "Set ODBC Port to 9000 (default) or your preferred port number"
                },
                {
                  step: "3",
                  title: "Allow External Access",
                  description: "Enable 'Allow External ODBC Requests' in Tally Prime settings"
                },
                {
                  step: "4",
                  title: "Start ODBC Server",
                  description: "Restart Tally Prime to activate ODBC server on the specified port"
                },
                {
                  step: "5",
                  title: "Test Connection",
                  description: "Use Server Configuration in this app to test the connection"
                }
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{item.title}</h4>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Download className="h-5 w-5 text-blue-600 mr-2" />
              <h3 className="font-semibold text-blue-800">Default Connection Settings</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-blue-700">Server Address:</span>
                <p className="text-blue-600 font-mono">localhost</p>
              </div>
              <div>
                <span className="font-medium text-blue-700">Port:</span>
                <p className="text-blue-600 font-mono">9000</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="font-semibold text-red-800">Troubleshooting</h3>
            </div>
            <ul className="text-red-700 text-sm space-y-1">
              <li>• Ensure Tally Prime is running before connecting</li>
              <li>• Check firewall settings if connecting remotely</li>
              <li>• Verify ODBC port is not blocked by antivirus software</li>
              <li>• Contact support if connection issues persist</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Additional Resources */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center mb-6">
          <Book className="h-6 w-6 text-indigo-600 mr-3" />
          <h2 className="text-2xl font-semibold text-gray-900">Additional Resources</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <Book className="h-8 w-8 text-indigo-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Documentation</h3>
            <p className="text-sm text-gray-600">Comprehensive guides and tutorials</p>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <Download className="h-8 w-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Downloads</h3>
            <p className="text-sm text-gray-600">Latest updates and tools</p>
          </div>
          <div className="text-center p-6 bg-gray-50 rounded-lg">
            <HelpCircle className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">FAQ</h3>
            <p className="text-sm text-gray-600">Frequently asked questions</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gray-50 p-6"
    >
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center mb-2">
            {isSubRoute && (
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center text-blue-600 hover:text-blue-700 mr-4 p-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-1" />
                Back
              </button>
            )}
            <div className="flex items-center">
              <Settings className="h-6 w-6 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                {getCurrentSettingTitle()}
              </h1>
            </div>
          </div>
          <p className="text-gray-600">
            {getCurrentSettingDescription()}
          </p>
        </div>

        <Routes>
          <Route index element={<SettingsOverview />} />
          <Route path="server" element={<ServerSettings />} />
          <Route path="company" element={<CompanySettings />} />
          <Route path="help" element={<HelpSupport />} />
        </Routes>
      </div>
    </motion.div>
  );
};

export default SettingsModule;
