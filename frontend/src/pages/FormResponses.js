import { format } from 'date-fns';
import { ArrowLeft, Download, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useForm } from '../contexts/FormContext';

const FormResponses = () => {
  const { id } = useParams();
  const { currentForm, responses, loading, getForm, getResponses, exportResponses } = useForm();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (id) {
      loadFormAndResponses();
    }
  }, [id, loadFormAndResponses]);

  const loadFormAndResponses = async () => {
    try {
      await getForm(id);
      await getResponses(id);
    } catch (error) {
      console.error('Failed to load form responses:', error);
    }
  };

  const handleExport = async (format) => {
    try {
      await exportResponses(id, format);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const filteredResponses = responses?.filter(response => {
    const matchesStatus = statusFilter === 'all' || response.status === statusFilter;
    const matchesSearch = !searchTerm || 
      response.responses?.some(r => 
        r.value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    return matchesStatus && matchesSearch;
  }) || [];

  if (loading && !currentForm) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading responses..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/dashboard" className="btn btn-secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Form Responses</h1>
            <p className="text-gray-500">{currentForm?.title}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="relative group">
            <button className="btn btn-primary">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Export JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="input pl-10"
                placeholder="Search responses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="synced">Synced</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responses */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium text-gray-900">
            Responses ({filteredResponses.length})
          </h2>
        </div>
        <div className="card-body p-0">
          {filteredResponses.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No responses found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responses
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredResponses.map((response) => (
                    <tr key={response._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(new Date(response.createdAt), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${
                          response.status === 'synced' ? 'badge-success' :
                          response.status === 'pending' ? 'badge-warning' :
                          'badge-danger'
                        }`}>
                          {response.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {response.responses?.slice(0, 3).map((resp, index) => (
                            <div key={index} className="text-sm">
                              <span className="font-medium text-gray-700">{resp.fieldLabel}:</span>
                              <span className="text-gray-600 ml-1">
                                {Array.isArray(resp.value) ? resp.value.join(', ') : resp.value}
                              </span>
                            </div>
                          ))}
                          {response.responses && response.responses.length > 3 && (
                            <div className="text-xs text-gray-400">
                              +{response.responses.length - 3} more fields
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormResponses;