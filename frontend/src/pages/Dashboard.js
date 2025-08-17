import {
    Plus
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from '../contexts/FormContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { 
    forms, 
    loading, 
    getForms, 
    deleteForm, 
    duplicateForm, 
    publishForm,
    exportResponses
  } = useForm();
  
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [duplicateTitle, setDuplicateTitle] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      await getForms();
    } catch (error) {
      console.error('Failed to load forms:', error);
      toast.error('Failed to load forms');
    }
  };

  const handleDeleteForm = async () => {
    if (!selectedForm) return;
    
    try {
      await deleteForm(selectedForm._id);
      setShowDeleteModal(false);
      setSelectedForm(null);
      toast.success('Form deleted successfully');
    } catch (error) {
      console.error('Failed to delete form:', error);
      toast.error('Failed to delete form');
    }
  };

  const handleDuplicateForm = async () => {
    if (!selectedForm || !duplicateTitle.trim()) return;
    
    try {
      const newForm = await duplicateForm(selectedForm._id, duplicateTitle);
      setShowDuplicateModal(false);
      setSelectedForm(null);
      setDuplicateTitle('');
      toast.success('Form duplicated successfully');
      navigate(`/forms/${newForm._id}/edit`);
    } catch (error) {
      console.error('Failed to duplicate form:', error);
      toast.error('Failed to duplicate form');
    }
  };

  // Rest of your Dashboard component code stays the same...
  // Just make sure all the render functions are properly defined

  return (
    <div className="space-y-8">
      {/* Your existing Dashboard JSX content */}
      <div className="bg-gradient-to-r from-primary-500 via-purple-600 to-pink-500 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">
                Welcome back, {user?.profile?.name?.split(' ')[0] || 'Builder'}! 👋
              </h1>
              <p className="text-white/90 text-lg">
                {forms.length === 0 
                  ? "Ready to create your first amazing form?"
                  : `You have ${forms.length} form${forms.length !== 1 ? 's' : ''} in your workspace`
                }
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                to="/forms/new"
                className="btn bg-white text-primary-600 hover:bg-white/90 border-0 shadow-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Form
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add the rest of your Dashboard content here */}
    </div>
  );
};

export default Dashboard;