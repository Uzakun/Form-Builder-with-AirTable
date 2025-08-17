import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    CheckCircle,
    FileText,
    Upload,
    X
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useForm } from '../contexts/FormContext';

const FormViewer = ({ embedded = false }) => {
  const { id } = useParams();
  const { currentForm, loading, getForm, submitResponse, validateResponse } = useForm();
  
  const [responses, setResponses] = useState({});
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [visibleFields, setVisibleFields] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (id) {
      loadForm();
    }
  }, [id]);

  useEffect(() => {
    if (currentForm?.fields) {
      updateVisibleFields();
    }
  }, [currentForm, responses]);

  const loadForm = async () => {
    try {
      await getForm(id);
    } catch (error) {
      toast.error('Form not found or unavailable');
    }
  };

  const updateVisibleFields = async () => {
    if (!currentForm) return;

    try {
      const responseArray = Object.keys(responses).map(fieldId => ({
        fieldId,
        value: responses[fieldId]
      }));

      const validation = await validateResponse(currentForm._id, responseArray);
      setVisibleFields(validation.visibleFields || []);
      setErrors(validation.errors || {});
    } catch (error) {
      // Fallback to showing all fields if validation fails
      setVisibleFields(currentForm.fields.map(f => ({
        id: f.airtableFieldId,
        label: f.label,
        type: f.airtableFieldType,
        required: f.required
      })));
    }
  };

  const handleInputChange = (fieldId, value) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));
    
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => ({
        ...prev,
        [fieldId]: undefined
      }));
    }
  };

  const handleFileUpload = (fieldId, acceptedFiles) => {
    setFiles(prev => ({
      ...prev,
      [fieldId]: acceptedFiles
    }));
    
    // Update responses to include file names
    const fileNames = acceptedFiles.map(file => file.name).join(', ');
    handleInputChange(fieldId, fileNames);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (submitting) return;
    
    setSubmitting(true);
    
    try {
      // Prepare file uploads
      const fileUploads = [];
      Object.keys(files).forEach(fieldId => {
        files[fieldId].forEach(file => {
          fileUploads.push({
            fieldName: fieldId,
            file: file
          });
        });
      });

      // Calculate completion time
      const timeToComplete = Math.round((Date.now() - startTime) / 1000);
      
      const responseData = {
        ...responses,
        timeToComplete
      };

      const result = await submitResponse(currentForm._id, responseData, fileUploads);
      
      setSubmitted(true);
      toast.success(result.message || 'Form submitted successfully!');
      
      // Redirect if specified
      if (result.redirectUrl) {
        setTimeout(() => {
          window.location.href = result.redirectUrl;
        }, 2000);
      }
      
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const fieldConfig = currentForm.fields.find(f => f.airtableFieldId === field.id);
    if (!fieldConfig) return null;

    const value = responses[field.id] || '';
    const error = errors[field.id];

    switch (field.type) {
      case 'singleLineText':
        return (
          <div key={field.id} className="form-field">
            <label className={`label ${field.required ? 'label-required' : ''}`}>
              {field.label}
            </label>
            {fieldConfig.description && (
              <p className="help-text">{fieldConfig.description}</p>
            )}
            <input
              type="text"
              className={`input ${error ? 'input-error' : ''}`}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={fieldConfig.placeholder || `Enter ${field.label.toLowerCase()}`}
              required={field.required}
            />
            {error && <p className="error-text">{error}</p>}
          </div>
        );

      case 'multilineText':
        return (
          <div key={field.id} className="form-field">
            <label className={`label ${field.required ? 'label-required' : ''}`}>
              {field.label}
            </label>
            {fieldConfig.description && (
              <p className="help-text">{fieldConfig.description}</p>
            )}
            <textarea
              className={`textarea ${error ? 'input-error' : ''}`}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              placeholder={fieldConfig.placeholder || `Enter ${field.label.toLowerCase()}`}
              rows={4}
              required={field.required}
            />
            {error && <p className="error-text">{error}</p>}
          </div>
        );

      case 'singleSelect':
        return (
          <div key={field.id} className="form-field">
            <label className={`label ${field.required ? 'label-required' : ''}`}>
              {field.label}
            </label>
            {fieldConfig.description && (
              <p className="help-text">{fieldConfig.description}</p>
            )}
            <select
              className={`select ${error ? 'input-error' : ''}`}
              value={value}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.required}
            >
              <option value="">Select an option...</option>
              {fieldConfig.options?.map((option) => (
                <option key={option.id} value={option.name}>
                  {option.name}
                </option>
              ))}
            </select>
            {error && <p className="error-text">{error}</p>}
          </div>
        );

      case 'multipleSelect':
        return (
          <div key={field.id} className="form-field">
            <label className={`label ${field.required ? 'label-required' : ''}`}>
              {field.label}
            </label>
            {fieldConfig.description && (
              <p className="help-text">{fieldConfig.description}</p>
            )}
            <div className="space-y-2">
              {fieldConfig.options?.map((option) => (
                <label key={option.id} className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    checked={(value || '').split(',').includes(option.name)}
                    onChange={(e) => {
                      const currentValues = (value || '').split(',').filter(v => v.trim());
                      let newValues;
                      
                      if (e.target.checked) {
                        newValues = [...currentValues, option.name];
                      } else {
                        newValues = currentValues.filter(v => v !== option.name);
                      }
                      
                      handleInputChange(field.id, newValues.join(','));
                    }}
                  />
                  <span className="ml-2 text-sm text-gray-700">{option.name}</span>
                </label>
              ))}
            </div>
            {error && <p className="error-text">{error}</p>}
          </div>
        );

      case 'attachment':
        return (
          <FileUploadField
            key={field.id}
            field={field}
            fieldConfig={fieldConfig}
            files={files[field.id] || []}
            onFilesChange={(files) => handleFileUpload(field.id, files)}
            error={error}
          />
        );

      default:
        return null;
    }
  };

  if (loading && !currentForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" text="Loading form..." />
      </div>
    );
  }

  if (!currentForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h1 className="text-xl font-medium text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-500">This form may have been deleted or is no longer available.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${embedded ? 'bg-transparent' : 'bg-gray-50'}`}>
        <div className="max-w-md w-full text-center">
          <div className="card">
            <div className="card-body text-center py-12">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Thank You!</h1>
              <p className="text-gray-600 mb-6">
                {currentForm.settings.successMessage}
              </p>
              {currentForm.settings.redirectUrl && (
                <p className="text-sm text-gray-500">
                  Redirecting you shortly...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fieldsPerStep = Math.ceil(visibleFields.length / 3);
  const totalSteps = Math.ceil(visibleFields.length / fieldsPerStep);
  const currentStepFields = visibleFields.slice(
    currentStep * fieldsPerStep,
    (currentStep + 1) * fieldsPerStep
  );

  return (
    <div className={`min-h-screen ${embedded ? 'bg-transparent' : 'bg-gray-50 py-8'}`}>
      <div className="max-w-2xl mx-auto px-4">
        <form onSubmit={handleSubmit}>
          <div className="card">
            {/* Form Header */}
            <div className="card-header text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {currentForm.title}
              </h1>
              {currentForm.description && (
                <p className="text-gray-600">{currentForm.description}</p>
              )}
              
              {/* Progress Bar */}
              {currentForm.settings.showProgressBar && totalSteps > 1 && (
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Step {currentStep + 1} of {totalSteps}</span>
                    <span>{Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="card-body form-section">
              {currentStepFields.map(field => renderField(field))}
              
              {currentStepFields.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-gray-500">No fields to display</p>
                </div>
              )}
            </div>

            {/* Form Navigation */}
            <div className="card-footer">
              <div className="flex justify-between items-center">
                {totalSteps > 1 && currentStep > 0 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="btn btn-secondary"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </button>
                ) : (
                  <div />
                )}

                {currentStep === totalSteps - 1 ? (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary disabled:opacity-50"
                  >
                    {submitting ? (
                      <LoadingSpinner size="sm" color="white" />
                    ) : (
                      currentForm.settings.submitButtonText || 'Submit'
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="btn btn-primary"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// File Upload Field Component
const FileUploadField = ({ field, fieldConfig, files, onFilesChange, error }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFilesChange,
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  });

  return (
    <div className="form-field">
      <label className={`label ${field.required ? 'label-required' : ''}`}>
        {field.label}
      </label>
      {fieldConfig.description && (
        <p className="help-text">{fieldConfig.description}</p>
      )}
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-primary-400 bg-primary-50' 
            : error
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        {isDragActive ? (
          <p className="text-primary-600">Drop files here...</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-1">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Max 5 files, 10MB each
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 rounded-md p-2">
              <div className="flex items-center">
                <FileText className="h-4 w-4 text-gray-500 mr-2" />
                <span className="text-sm text-gray-700">{file.name}</span>
                <span className="text-xs text-gray-500 ml-2">
                  ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newFiles = files.filter((_, i) => i !== index);
                  onFilesChange(newFiles);
                }}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
};

export default FormViewer;