import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    Check,
    Columns,
    Database,
    Loader2,
    Table
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useForm } from '../contexts/FormContext';

const FormBuilder = () => {
  const navigate = useNavigate();
  const { 
    bases, 
    tables, 
    fields, 
    loading, 
    getBases, 
    getTables, 
    getFields, 
    createForm,
    testAirtableConnection 
  } = useForm();

  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    selectedBase: null,
    selectedTable: null,
    selectedFields: [],
    settings: {
      allowMultipleSubmissions: true,
      showProgressBar: true,
      submitButtonText: 'Submit',
      successMessage: 'Thank you for your submission!'
    }
  });

  const steps = [
    { id: 'connection', title: 'Test Connection', icon: Database },
    { id: 'base', title: 'Select Base', icon: Database },
    { id: 'table', title: 'Select Table', icon: Table },
    { id: 'fields', title: 'Configure Fields', icon: Columns },
    { id: 'settings', title: 'Form Settings', icon: Check }
  ];

  useEffect(() => {
    if (currentStep === 0) {
      testConnection();
    }
  }, [currentStep]);

  const testConnection = async () => {
    try {
      await testAirtableConnection();
      // Auto-advance to next step after successful connection
      setTimeout(() => {
        setCurrentStep(1);
        loadBases();
      }, 1000);
    } catch (error) {
      toast.error('Please check your Airtable connection and try again.');
    }
  };

  const loadBases = async () => {
    try {
      await getBases();
    } catch (error) {
      toast.error('Failed to load Airtable bases');
    }
  };

  const handleBaseSelect = async (base) => {
    setFormData(prev => ({
      ...prev,
      selectedBase: base,
      selectedTable: null,
      selectedFields: []
    }));
    
    try {
      await getTables(base.id);
      setCurrentStep(2);
    } catch (error) {
      toast.error('Failed to load tables');
    }
  };

  const handleTableSelect = async (table) => {
    setFormData(prev => ({
      ...prev,
      selectedTable: table,
      selectedFields: []
    }));
    
    try {
      const response = await getFields(formData.selectedBase.id, table.id);
      setCurrentStep(3);
    } catch (error) {
      toast.error('Failed to load fields');
    }
  };

  const handleFieldToggle = (field) => {
    setFormData(prev => {
      const selectedFields = prev.selectedFields.find(f => f.id === field.id)
        ? prev.selectedFields.filter(f => f.id !== field.id)
        : [
            ...prev.selectedFields,
            {
              ...field,
              label: field.name,
              required: false,
              order: prev.selectedFields.length
            }
          ];
      
      return { ...prev, selectedFields };
    });
  };

  const handleFieldUpdate = (fieldId, updates) => {
    setFormData(prev => ({
      ...prev,
      selectedFields: prev.selectedFields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  };

  const handleCreateForm = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a form title');
      return;
    }

    if (formData.selectedFields.length === 0) {
      toast.error('Please select at least one field');
      return;
    }

    try {
      const formPayload = {
        title: formData.title,
        description: formData.description,
        airtableBaseId: formData.selectedBase.id,
        airtableBaseName: formData.selectedBase.name,
        airtableTableId: formData.selectedTable.id,
        airtableTableName: formData.selectedTable.name,
        fields: formData.selectedFields.map(field => ({
          airtableFieldId: field.id,
          airtableFieldName: field.name,
          airtableFieldType: field.type,
          label: field.label,
          required: field.required,
          options: field.options,
          order: field.order
        })),
        settings: formData.settings
      };

      const newForm = await createForm(formPayload);
      navigate(`/forms/${newForm._id}/edit`);
    } catch (error) {
      console.error('Failed to create form:', error);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return false; // Connection test handles auto-advance
      case 1: return formData.selectedBase !== null;
      case 2: return formData.selectedTable !== null;
      case 3: return formData.selectedFields.length > 0;
      case 4: return formData.title.trim() !== '';
      default: return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center py-12">
            <Database className="mx-auto h-12 w-12 text-primary-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Testing Airtable Connection
            </h3>
            <p className="text-gray-500 mb-6">
              Verifying your Airtable access and permissions...
            </p>
            <LoadingSpinner size="lg" />
          </div>
        );

      case 1:
        return (
          <div>
            <div className="text-center mb-8">
              <Database className="mx-auto h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select Airtable Base
              </h3>
              <p className="text-gray-500">
                Choose the Airtable base you want to connect your form to
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bases.map((base) => (
                  <button
                    key={base.id}
                    onClick={() => handleBaseSelect(base)}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      formData.selectedBase?.id === base.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{base.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Permission: {base.permissionLevel}
                        </p>
                      </div>
                      {formData.selectedBase?.id === base.id && (
                        <Check className="h-5 w-5 text-primary-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div>
            <div className="text-center mb-8">
              <Table className="mx-auto h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select Table
              </h3>
              <p className="text-gray-500">
                Choose the table where form responses will be stored
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="space-y-4">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => handleTableSelect(table)}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                      formData.selectedTable?.id === table.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{table.name}</h4>
                        {table.description && (
                          <p className="text-sm text-gray-500 mt-1">{table.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">
                          {table.fields.length} fields available
                        </p>
                      </div>
                      {formData.selectedTable?.id === table.id && (
                        <Check className="h-5 w-5 text-primary-600" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div>
            <div className="text-center mb-8">
              <Columns className="mx-auto h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Configure Form Fields
              </h3>
              <p className="text-gray-500">
                Select which fields to include in your form and customize their settings
              </p>
            </div>

            <div className="space-y-4">
              {fields.map((field) => {
                const isSelected = formData.selectedFields.find(f => f.id === field.id);
                
                return (
                  <div
                    key={field.id}
                    className={`border-2 rounded-lg p-4 transition-colors ${
                      isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={!!isSelected}
                          onChange={() => handleFieldToggle(field)}
                          className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                        />
                        <div className="ml-3">
                          <h4 className="font-medium text-gray-900">{field.name}</h4>
                          <p className="text-sm text-gray-500">{field.type}</p>
                        </div>
                      </div>
                      <span className={`badge ${isSelected ? 'badge-primary' : 'badge-gray'}`}>
                        {field.type}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="space-y-3 pt-3 border-t border-gray-200">
                        <div>
                          <label className="label">
                            Field Label
                          </label>
                          <input
                            type="text"
                            className="input"
                            value={isSelected.label}
                            onChange={(e) => handleFieldUpdate(field.id, { label: e.target.value })}
                            placeholder="Enter field label"
                          />
                        </div>
                        
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected.required}
                            onChange={(e) => handleFieldUpdate(field.id, { required: e.target.checked })}
                            className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                          />
                          <label className="ml-2 text-sm text-gray-700">
                            Required field
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {formData.selectedFields.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-gray-500">Select at least one field to continue</p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div>
            <div className="text-center mb-8">
              <Check className="mx-auto h-12 w-12 text-primary-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Form Settings
              </h3>
              <p className="text-gray-500">
                Configure your form details and behavior
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="label label-required">
                  Form Title
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter form title"
                />
              </div>

              <div>
                <label className="label">
                  Description (Optional)
                </label>
                <textarea
                  className="textarea"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this form is for..."
                  rows={3}
                />
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Form Behavior</h4>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Allow Multiple Submissions
                      </label>
                      <p className="text-sm text-gray-500">
                        Allow users to submit the form multiple times
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.settings.allowMultipleSubmissions}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, allowMultipleSubmissions: e.target.checked }
                      }))}
                      className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        Show Progress Bar
                      </label>
                      <p className="text-sm text-gray-500">
                        Display progress indicator for multi-step forms
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.settings.showProgressBar}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, showProgressBar: e.target.checked }
                      }))}
                      className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Customization</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">
                      Submit Button Text
                    </label>
                    <input
                      type="text"
                      className="input"
                      value={formData.settings.submitButtonText}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, submitButtonText: e.target.value }
                      }))}
                      placeholder="Submit"
                    />
                  </div>

                  <div>
                    <label className="label">
                      Success Message
                    </label>
                    <textarea
                      className="textarea"
                      value={formData.settings.successMessage}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, successMessage: e.target.value }
                      }))}
                      placeholder="Thank you for your submission!"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Form Preview */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Preview</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">{formData.title || 'Untitled Form'}</h5>
                  {formData.description && (
                    <p className="text-gray-600 mb-4">{formData.description}</p>
                  )}
                  <div className="space-y-3">
                    {formData.selectedFields.slice(0, 3).map((field, index) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <div className="h-8 bg-white border border-gray-300 rounded-md"></div>
                      </div>
                    ))}
                    {formData.selectedFields.length > 3 && (
                      <p className="text-sm text-gray-500 italic">
                        ... and {formData.selectedFields.length - 3} more fields
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                  {index !== steps.length - 1 && (
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className={`h-0.5 w-full ${isCompleted ? 'bg-primary-600' : 'bg-gray-200'}`} />
                    </div>
                  )}
                  
                  <div className="relative flex items-center justify-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                        isCompleted
                          ? 'border-primary-600 bg-primary-600'
                          : isCurrent
                          ? 'border-primary-600 bg-white'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-6 w-6 text-white" />
                      ) : (
                        <Icon className={`h-6 w-6 ${isCurrent ? 'text-primary-600' : 'text-gray-500'}`} />
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${isCurrent ? 'text-primary-600' : 'text-gray-500'}`}>
                      {step.title}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="card">
        <div className="card-body min-h-[500px]">
          {renderStepContent()}
        </div>
        
        {/* Navigation */}
        <div className="card-footer">
          <div className="flex justify-between">
            <button
              onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </button>

            {currentStep === steps.length - 1 ? (
              <button
                onClick={handleCreateForm}
                disabled={!canProceed() || loading}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Create Form
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={!canProceed()}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;