import axios from 'axios';
import { createContext, useContext, useReducer } from 'react';
import { toast } from 'react-toastify';

// Initial state
const initialState = {
  forms: [],
  currentForm: null,
  bases: [],
  tables: [],
  fields: [],
  responses: [],
  analytics: null,
  loading: false,
  error: null
};

// Action types
const FORM_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_FORMS: 'SET_FORMS',
  SET_CURRENT_FORM: 'SET_CURRENT_FORM',
  ADD_FORM: 'ADD_FORM',
  UPDATE_FORM: 'UPDATE_FORM',
  DELETE_FORM: 'DELETE_FORM',
  SET_BASES: 'SET_BASES',
  SET_TABLES: 'SET_TABLES',
  SET_FIELDS: 'SET_FIELDS',
  SET_RESPONSES: 'SET_RESPONSES',
  ADD_RESPONSE: 'ADD_RESPONSE',
  SET_ANALYTICS: 'SET_ANALYTICS'
};

// Reducer
const formReducer = (state, action) => {
  switch (action.type) {
    case FORM_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case FORM_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case FORM_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    
    case FORM_ACTIONS.SET_FORMS:
      return { ...state, forms: action.payload };
    
    case FORM_ACTIONS.SET_CURRENT_FORM:
      return { ...state, currentForm: action.payload };
    
    case FORM_ACTIONS.ADD_FORM:
      return { ...state, forms: [action.payload, ...state.forms] };
    
    case FORM_ACTIONS.UPDATE_FORM:
      return {
        ...state,
        forms: state.forms.map(form => 
          form._id === action.payload._id ? action.payload : form
        ),
        currentForm: state.currentForm?._id === action.payload._id 
          ? action.payload 
          : state.currentForm
      };
    
    case FORM_ACTIONS.DELETE_FORM:
      return {
        ...state,
        forms: state.forms.filter(form => form._id !== action.payload),
        currentForm: state.currentForm?._id === action.payload 
          ? null 
          : state.currentForm
      };
    
    case FORM_ACTIONS.SET_BASES:
      return { ...state, bases: action.payload };
    
    case FORM_ACTIONS.SET_TABLES:
      return { ...state, tables: action.payload };
    
    case FORM_ACTIONS.SET_FIELDS:
      return { ...state, fields: action.payload };
    
    case FORM_ACTIONS.SET_RESPONSES:
      return { ...state, responses: action.payload };
    
    case FORM_ACTIONS.ADD_RESPONSE:
      return { ...state, responses: [action.payload, ...state.responses] };
    
    case FORM_ACTIONS.SET_ANALYTICS:
      return { ...state, analytics: action.payload };
    
    default:
      return state;
  }
};

// Create context
const FormContext = createContext();

// Custom hook to use form context
export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
};

// Form provider component
export const FormProvider = ({ children }) => {
  const [state, dispatch] = useReducer(formReducer, initialState);

  // Helper functions
  const setLoading = (loading) => {
    dispatch({ type: FORM_ACTIONS.SET_LOADING, payload: loading });
  };

  const setError = (error) => {
    dispatch({ type: FORM_ACTIONS.SET_ERROR, payload: error });
  };

  const clearError = () => {
    dispatch({ type: FORM_ACTIONS.CLEAR_ERROR });
  };

  // Form management functions
  const getForms = async (params = {}) => {
    try {
      setLoading(true);
      const response = await axios.get('/api/forms', { params });
      dispatch({ type: FORM_ACTIONS.SET_FORMS, payload: response.data.forms });
      return response.data;
    } catch (error) {
      console.error('Get forms error:', error);
      setError(error.response?.data?.message || 'Failed to fetch forms');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getForm = async (id) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/forms/${id}`);
      dispatch({ type: FORM_ACTIONS.SET_CURRENT_FORM, payload: response.data.form });
      return response.data.form;
    } catch (error) {
      console.error('Get form error:', error);
      setError(error.response?.data?.message || 'Failed to fetch form');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createForm = async (formData) => {
    try {
      setLoading(true);
      const response = await axios.post('/api/forms', formData);
      dispatch({ type: FORM_ACTIONS.ADD_FORM, payload: response.data.form });
      toast.success('Form created successfully!');
      return response.data.form;
    } catch (error) {
      console.error('Create form error:', error);
      const message = error.response?.data?.message || 'Failed to create form';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateForm = async (id, formData) => {
    try {
      setLoading(true);
      const response = await axios.put(`/api/forms/${id}`, formData);
      dispatch({ type: FORM_ACTIONS.UPDATE_FORM, payload: response.data.form });
      toast.success('Form updated successfully!');
      return response.data.form;
    } catch (error) {
      console.error('Update form error:', error);
      const message = error.response?.data?.message || 'Failed to update form';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteForm = async (id) => {
    try {
      setLoading(true);
      await axios.delete(`/api/forms/${id}`);
      dispatch({ type: FORM_ACTIONS.DELETE_FORM, payload: id });
      toast.success('Form deleted successfully!');
    } catch (error) {
      console.error('Delete form error:', error);
      const message = error.response?.data?.message || 'Failed to delete form';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const duplicateForm = async (id, title) => {
    try {
      setLoading(true);
      const response = await axios.post(`/api/forms/${id}/duplicate`, { title });
      dispatch({ type: FORM_ACTIONS.ADD_FORM, payload: response.data.form });
      toast.success('Form duplicated successfully!');
      return response.data.form;
    } catch (error) {
      console.error('Duplicate form error:', error);
      const message = error.response?.data?.message || 'Failed to duplicate form';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const publishForm = async (id, isPublished) => {
    try {
      const response = await axios.post(`/api/forms/${id}/publish`, { isPublished });
      dispatch({ type: FORM_ACTIONS.UPDATE_FORM, payload: response.data.form });
      toast.success(`Form ${isPublished ? 'published' : 'unpublished'} successfully!`);
      return response.data.form;
    } catch (error) {
      console.error('Publish form error:', error);
      const message = error.response?.data?.message || 'Failed to update form status';
      toast.error(message);
      throw error;
    }
  };

  // Airtable integration functions
  const getBases = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/airtable/bases');
      dispatch({ type: FORM_ACTIONS.SET_BASES, payload: response.data.bases });
      return response.data.bases;
    } catch (error) {
      console.error('Get bases error:', error);
      setError(error.response?.data?.message || 'Failed to fetch bases');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getTables = async (baseId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/airtable/bases/${baseId}/tables`);
      dispatch({ type: FORM_ACTIONS.SET_TABLES, payload: response.data.tables });
      return response.data.tables;
    } catch (error) {
      console.error('Get tables error:', error);
      setError(error.response?.data?.message || 'Failed to fetch tables');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getFields = async (baseId, tableId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/airtable/bases/${baseId}/tables/${tableId}/fields`);
      dispatch({ type: FORM_ACTIONS.SET_FIELDS, payload: response.data.fields });
      return response.data;
    } catch (error) {
      console.error('Get fields error:', error);
      setError(error.response?.data?.message || 'Failed to fetch fields');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const testAirtableConnection = async () => {
    try {
      const response = await axios.post('/api/airtable/test-connection');
      toast.success('Airtable connection successful!');
      return response.data;
    } catch (error) {
      console.error('Test connection error:', error);
      const message = error.response?.data?.message || 'Connection test failed';
      toast.error(message);
      throw error;
    }
  };

  // Response management functions
  const getResponses = async (formId, params = {}) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/forms/${formId}/responses`, { params });
      dispatch({ type: FORM_ACTIONS.SET_RESPONSES, payload: response.data.responses });
      return response.data;
    } catch (error) {
      console.error('Get responses error:', error);
      setError(error.response?.data?.message || 'Failed to fetch responses');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async (formId, responseData, files = []) => {
    try {
      const formData = new FormData();
      
      // Add response data
      Object.keys(responseData).forEach(key => {
        formData.append(key, responseData[key]);
      });
      
      // Add files
      files.forEach(file => {
        formData.append(file.fieldName, file.file);
      });
      
      const response = await axios.post(`/api/responses/submit/${formId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      dispatch({ type: FORM_ACTIONS.ADD_RESPONSE, payload: response.data });
      return response.data;
    } catch (error) {
      console.error('Submit response error:', error);
      throw error;
    }
  };

  const validateResponse = async (formId, responses) => {
    try {
      const response = await axios.post(`/api/responses/validate/${formId}`, { responses });
      return response.data;
    } catch (error) {
      console.error('Validate response error:', error);
      throw error;
    }
  };

  // Analytics functions
  const getAnalytics = async (formId, params = {}) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/forms/${formId}/analytics`, { params });
      dispatch({ type: FORM_ACTIONS.SET_ANALYTICS, payload: response.data });
      return response.data;
    } catch (error) {
      console.error('Get analytics error:', error);
      setError(error.response?.data?.message || 'Failed to fetch analytics');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const exportResponses = async (formId, format = 'csv', params = {}) => {
    try {
      const response = await axios.get(`/api/responses/export/${formId}`, {
        params: { format, ...params },
        responseType: format === 'csv' ? 'blob' : 'json'
      });
      
      if (format === 'csv') {
        // Create download link for CSV
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `form_responses_${formId}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
      
      toast.success('Export completed successfully!');
      return response.data;
    } catch (error) {
      console.error('Export responses error:', error);
      toast.error('Failed to export responses');
      throw error;
    }
  };

  // Context value
  const value = {
    ...state,
    // Form management
    getForms,
    getForm,
    createForm,
    updateForm,
    deleteForm,
    duplicateForm,
    publishForm,
    // Airtable integration
    getBases,
    getTables,
    getFields,
    testAirtableConnection,
    // Response management
    getResponses,
    submitResponse,
    validateResponse,
    // Analytics
    getAnalytics,
    exportResponses,
    // Utility functions
    setLoading,
    setError,
    clearError
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
};