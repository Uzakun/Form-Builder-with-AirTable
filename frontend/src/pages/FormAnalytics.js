import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import {
    Activity,
    ArrowLeft,
    BarChart3,
    Calendar,
    Download,
    Eye,
    PieChart,
    TrendingUp,
    Users
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CartesianGrid, Cell, Legend, Line, LineChart, PieChart as RechartsPieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useForm } from '../contexts/FormContext';

const FormAnalytics = () => {
  const { id } = useParams();
  const { currentForm, analytics, loading, getForm, getAnalytics, exportResponses } = useForm();
  
  const [dateRange, setDateRange] = useState('7d');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (id) {
      loadFormAndAnalytics();
    }
  }, [id, dateRange, startDate, endDate]);

  const loadFormAndAnalytics = async () => {
    try {
      await getForm(id);
      
      let analyticsStartDate = startDate;
      let analyticsEndDate = endDate;
      
      if (dateRange !== 'custom') {
        const days = parseInt(dateRange.replace('d', ''));
        analyticsStartDate = format(startOfDay(subDays(new Date(), days)), 'yyyy-MM-dd');
        analyticsEndDate = format(endOfDay(new Date()), 'yyyy-MM-dd');
      }
      
      await getAnalytics(id, {
        startDate: analyticsStartDate,
        endDate: analyticsEndDate
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    if (range !== 'custom') {
      const days = parseInt(range.replace('d', ''));
      setStartDate(format(subDays(new Date(), days), 'yyyy-MM-dd'));
      setEndDate(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  const handleExport = async (format) => {
    try {
      await exportResponses(id, format, { startDate, endDate });
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Prepare chart data
  const chartData = analytics?.analytics?.responsesByDay ? 
    Object.entries(
      analytics.analytics.responsesByDay.reduce((acc, item) => {
        const date = item.date;
        if (!acc[date]) {
          acc[date] = { date, submissions: 0, views: 0 };
        }
        if (item.status === 'synced') {
          acc[date].submissions += 1;
        }
        acc[date].views += 1;
        return acc;
      }, {})
    ).map(([_, data]) => data).sort((a, b) => new Date(a.date) - new Date(b.date))
    : [];

  const statusData = [
    { name: 'Successful', value: analytics?.analytics?.successfulSubmissions || 0, color: '#10B981' },
    { name: 'Failed', value: (analytics?.analytics?.totalResponses || 0) - (analytics?.analytics?.successfulSubmissions || 0), color: '#EF4444' }
  ];

  if (loading && !currentForm) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading analytics..." />
      </div>
    );
  }

  if (!currentForm) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-medium text-gray-900">Form not found</h1>
        <Link to="/dashboard" className="btn btn-primary mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/dashboard"
            className="btn btn-secondary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{currentForm.title}</h1>
            <p className="text-gray-500">Analytics & Performance</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Link
            to={`/forms/${id}/responses`}
            className="btn btn-secondary"
          >
            <Users className="h-4 w-4 mr-2" />
            View Responses
          </Link>
          <div className="relative group">
            <button className="btn btn-primary">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Date Range:</span>
            </div>
            
            <div className="flex space-x-2">
              {['7d', '30d', '90d'].map((range) => (
                <button
                  key={range}
                  onClick={() => handleDateRangeChange(range)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    dateRange === range
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Last {range.replace('d', ' days')}
                </button>
              ))}
              <button
                onClick={() => setDateRange('custom')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  dateRange === 'custom'
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Custom
              </button>
            </div>
            
            {dateRange === 'custom' && (
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input text-sm"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input text-sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Eye className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentForm.stats?.totalViews || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Submissions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentForm.stats?.totalSubmissions || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {currentForm.stats?.conversionRate || 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg. Completion Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics?.analytics?.averageCompletionTime 
                    ? `${Math.round(analytics.analytics.averageCompletionTime)}s`
                    : '0s'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submissions Over Time */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Submissions Over Time
            </h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="submissions" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    name="Submissions"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    name="Views"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Submission Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Submission Status
            </h3>
          </div>
          <div className="card-body">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <RechartsPieChart
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </RechartsPieChart>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">Form Published</p>
                <p className="text-sm text-gray-500">
                  {format(new Date(currentForm.updatedAt), 'MMM d, yyyy at h:mm a')}
                </p>
              </div>
              <span className="badge badge-success">Active</span>
            </div>
            
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <p className="text-sm font-medium text-gray-900">Last Response</p>
                <p className="text-sm text-gray-500">
                  {analytics?.analytics?.totalResponses > 0 
                    ? 'Recently' 
                    : 'No responses yet'
                  }
                </p>
              </div>
              <span className={`badge ${analytics?.analytics?.totalResponses > 0 ? 'badge-primary' : 'badge-gray'}`}>
                {analytics?.analytics?.totalResponses || 0} total
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormAnalytics;