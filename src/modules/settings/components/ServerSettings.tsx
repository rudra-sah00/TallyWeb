import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import AppConfigService from '../../../services/config/appConfig';
import { AppConfig } from '../../../services/config/appConfig';

const ServerSettings: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    serverAddress: '',
    serverPort: 9000,
    connectionTimeout: 30000
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const appConfig = AppConfigService.getInstance();
    const currentConfig = appConfig.getConfig();
    setConfig(currentConfig);
    
    if (currentConfig) {
      setEditForm({
        serverAddress: currentConfig.serverAddress || '',
        serverPort: currentConfig.serverPort || 9000,
        connectionTimeout: currentConfig.connectionTimeout || 30000
      });
    }
  }, []);

  const handleSave = () => {
    try {
      setError(null);
      
      if (!editForm.serverAddress.trim()) {
        setError('Server address is required');
        return;
      }

      const appConfig = AppConfigService.getInstance();
      appConfig.updateConfig({
        serverAddress: editForm.serverAddress.trim(),
        serverPort: editForm.serverPort,
        connectionTimeout: editForm.connectionTimeout
      });

      const updatedConfig = appConfig.getConfig();
      setConfig(updatedConfig);
      setIsEditing(false);
      setSuccess('Server settings saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  const handleCancel = () => {
    if (config) {
      setEditForm({
        serverAddress: config.serverAddress || '',
        serverPort: config.serverPort || 9000,
        connectionTimeout: config.connectionTimeout || 30000
      });
    }
    setIsEditing(false);
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Server Configuration</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {!config && !isEditing ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No server configuration found</p>
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Configure Server
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Server Address
            </label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.serverAddress}
                onChange={(e) => setEditForm(prev => ({ ...prev, serverAddress: e.target.value }))}
                placeholder="e.g., 192.168.1.100"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-mono">
                {config?.serverAddress || 'Not configured'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Server Port
            </label>
            {isEditing ? (
              <input
                type="number"
                value={editForm.serverPort}
                onChange={(e) => setEditForm(prev => ({ ...prev, serverPort: parseInt(e.target.value) || 9000 }))}
                min="1"
                max="65535"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-mono">
                {config?.serverPort || 'Not configured'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Connection Timeout (ms)
            </label>
            {isEditing ? (
              <input
                type="number"
                value={editForm.connectionTimeout}
                onChange={(e) => setEditForm(prev => ({ ...prev, connectionTimeout: parseInt(e.target.value) || 30000 }))}
                min="1000"
                max="300000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900 font-mono">
                {config?.connectionTimeout || 'Not configured'} ms
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Server URL
            </label>
            <p className="text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded border">
              {isEditing 
                ? `http://${editForm.serverAddress}:${editForm.serverPort}`
                : config?.serverAddress && config?.serverPort 
                  ? `http://${config.serverAddress}:${config.serverPort}`
                  : 'Not configured'
              }
            </p>
          </div>

          {isEditing && (
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-md mt-6">
            <h3 className="text-sm font-medium text-blue-800 mb-2">ℹ️ Configuration Source</h3>
            <p className="text-sm text-blue-700">
              These settings are populated from your selection in the Company Selection page. 
              Changes here will update your local browser storage and take effect immediately.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ServerSettings;
