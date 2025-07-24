import React, { createContext, useContext, ReactNode } from 'react';

interface CompanyContextType {
  selectedCompany: string;
  serverUrl: string;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ 
  children: ReactNode; 
  selectedCompany: string;
  serverUrl: string;
}> = ({ children, selectedCompany, serverUrl }) => {
  return (
    <CompanyContext.Provider value={{ selectedCompany, serverUrl }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
