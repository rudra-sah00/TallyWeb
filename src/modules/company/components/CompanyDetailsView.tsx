import React from 'react';
import { Building2, Mail, Phone, Globe, Users, FileText, CreditCard } from 'lucide-react';
import { TallyCompanyDetails } from '../../services/api/company/companyApiService';

interface CompanyDetailsViewProps {
  companyDetails: TallyCompanyDetails | null;
  loading: boolean;
}

const CompanyDetailsView: React.FC<CompanyDetailsViewProps> = ({ companyDetails, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading company details...</span>
        </div>
      </div>
    );
  }

  if (!companyDetails) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Company Details Available</h3>
        <p className="text-gray-500">Company details could not be loaded.</p>
      </div>
    );
  }

  // Helper to render key-value pairs, with support for arrays
  const renderKV = (label: string, value: any, icon?: React.ReactNode) => (
    <div key={label} className="flex items-start gap-2 py-1">
      {icon && <span className="pt-1">{icon}</span>}
      <span className="text-sm text-gray-700 font-medium min-w-[120px]">{label}:</span>
      <span className="text-sm text-gray-900 font-semibold whitespace-pre-line">
        {Array.isArray(value)
          ? value.filter(Boolean).map((v, i) => <div key={i}>{typeof v === 'object' ? JSON.stringify(v, null, 2) : v}</div>)
          : (value || 'N/A')}
      </span>
    </div>
  );

  // Basic Info
  const basicFields = [
    renderKV('Company Name', companyDetails?.name, <Building2 className="w-4 h-4 text-blue-500" />),
    renderKV('Formal Name', companyDetails?.formalName),
    renderKV('Trade Name', companyDetails?.tradeName),
    renderKV('Mailing Name', companyDetails?.mailingName),
    renderKV('Address', companyDetails?.address),
    renderKV('PIN Code', companyDetails?.pincode),
    renderKV('State', companyDetails?.stateName),
    renderKV('Country', companyDetails?.countryName),
    renderKV('Books From', companyDetails?.booksFrom),
  ];

  // Contact Info
  const contactFields = [
    renderKV('Email', companyDetails?.email, <Mail className="w-4 h-4 text-green-500" />),
    renderKV('Admin Email', companyDetails?.adminEmail),
    renderKV('Phone', companyDetails?.phone, <Phone className="w-4 h-4 text-green-500" />),
    renderKV('Mobile', companyDetails?.mobileNumbers, <Phone className="w-4 h-4 text-green-500" />),
    renderKV('Fax', companyDetails?.faxNumber),
    renderKV('Website', companyDetails?.website, <Globe className="w-4 h-4 text-green-500" />),
    renderKV('Contact Person', companyDetails?.contactPerson, <Users className="w-4 h-4 text-green-500" />),
    renderKV('Contact Number', companyDetails?.contactNumber),
    renderKV('SMS Name', companyDetails?.smsName),
  ];

  // Statutory/Registration Info
  const statutoryFields = [
    renderKV('PAN', companyDetails?.pan, <FileText className="w-4 h-4 text-purple-500" />),
    renderKV('GSTIN', companyDetails?.gstin),
    renderKV('GST Registration Type', companyDetails?.gstRegistrationType),
    renderKV('Type of Supply', companyDetails?.typeOfSupply),
    renderKV('VAT TIN', companyDetails?.vattinNumber),
    renderKV('Interstate ST Number', companyDetails?.interstateStNumber),
    renderKV('Authorised Person', companyDetails?.authorisedPerson),
    renderKV('Authorised Person Designation', companyDetails?.authorisedPersonDesignation),
  ];

  // Banking Info
  const bankingFields = [
    renderKV('Company Cheque Name', companyDetails?.companyChequeName, <CreditCard className="w-4 h-4 text-indigo-500" />),
    renderKV('Bank Names', companyDetails?.bankNames),
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Basic Info */}
        <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 p-8 shadow-lg hover:shadow-2xl transition-shadow duration-200">
          <h3 className="text-2xl font-extrabold text-blue-800 mb-6 flex items-center gap-3 tracking-tight">
            <Building2 className="w-6 h-6" /> Basic Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            {basicFields}
          </div>
        </div>
        {/* Contact Info */}
        <div className="bg-gradient-to-br from-green-50 to-white rounded-2xl border border-green-100 p-8 shadow-lg hover:shadow-2xl transition-shadow duration-200">
          <h3 className="text-2xl font-extrabold text-green-800 mb-6 flex items-center gap-3 tracking-tight">
            <Phone className="w-6 h-6" /> Contact & Communication
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            {contactFields}
          </div>
        </div>
        {/* Statutory Info */}
        <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100 p-8 shadow-lg hover:shadow-2xl transition-shadow duration-200">
          <h3 className="text-2xl font-extrabold text-purple-800 mb-6 flex items-center gap-3 tracking-tight">
            <FileText className="w-6 h-6" /> Statutory & Registration
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            {statutoryFields}
          </div>
        </div>
        {/* Banking Info */}
        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100 p-8 shadow-lg hover:shadow-2xl transition-shadow duration-200">
          <h3 className="text-2xl font-extrabold text-indigo-800 mb-6 flex items-center gap-3 tracking-tight">
            <CreditCard className="w-6 h-6" /> Banking Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            {bankingFields}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailsView; 