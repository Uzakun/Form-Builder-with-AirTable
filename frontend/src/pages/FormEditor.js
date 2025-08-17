import { ArrowLeft, Eye, Save, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useForm } from '../contexts/FormContext';

const FormEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentForm, loading, getForm, updateForm } = useForm();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    settings: {}
  });

  useEffect(() => {
    if (id) {
      loadForm();
    }
  }, [id]);

  useEffect(() => {
    if (currentForm) {
      setFormData({
        title: currentForm.title,
        description: currentForm.description || '',
        settings: currentForm.settings || {}
      });
    }
  }, [currentForm]);

  const loadForm = async () => {
    try {
      await getForm(id);
    } catch (error) {
      toast.error('Failed to load form');
      navigate('/dashboard');
    }
  };

  const handleSave = async () => {
    try {
      await updateForm(id, formData);
      toast.success('Form saved successfully!');
    } catch (error) {
      toast.error('Failed to save form');
    }
  };

  if (loading && !currentForm) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading form..." />
      </div>
    );
  }

  if (!currentForm) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-medium text-gray-900">Form not found</h1>
        <button onClick={() => navigate('/dashboard')} className="btn btn-primary mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-secondary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Form</h1>
            <p className="text-gray-500">{currentForm.title}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate(`/form/${id}`)}
            className="btn btn-secondary"
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? (
              <LoadingSpinner size="sm" color="white" className="mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Form Editor Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Settings */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Form Settings
              </h2>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="label label-required">Form Title</label>
                <input
                  type="text"
                  className="input"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter form title"
                />
              </div>
              
              <div>
                <label className="label">Description</label>
                <textarea
                  className="textarea"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your form..."
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form Builder */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-medium text-gray-900">Form Fields</h2>
            </div>
            <div className="card-body">
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  Form field editor coming soon! For now, you can edit the basic form settings.
                </p>
                <div className="space-y-2">
                  {currentForm.fields?.map((field, index) => (
                    <div key={field.airtableFieldId} className="p-3 border border-gray-200 rounded-lg text-left">
                      <div className="font-medium text-gray-900">{field.label}</div>
                      <div className="text-sm text-gray-500">{field.airtableFieldType}</div>
                      {field.required && <span className="badge badge-primary">Required</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormEditor;