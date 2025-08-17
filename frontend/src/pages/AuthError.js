import { Home, RefreshCw, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const AuthError = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="card">
          <div className="card-body py-12">
            <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Authentication Error
            </h1>
            <p className="text-gray-600 mb-6">
              We encountered an issue while trying to sign you in with Airtable. 
              This could be due to:
            </p>
            <ul className="text-left text-sm text-gray-500 mb-6 space-y-1">
              <li>• You denied access to Airtable</li>
              <li>• Network connection issues</li>
              <li>• Temporary service unavailability</li>
            </ul>
            <div className="space-y-3">
              <Link
                to="/"
                className="btn btn-primary w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Link>
              <Link
                to="/"
                className="btn btn-secondary w-full"
              >
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthError;