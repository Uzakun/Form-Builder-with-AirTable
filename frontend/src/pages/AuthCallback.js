import { CheckCircle, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleAuthCallback } = useAuth();
  const [status, setStatus] = useState('processing'); // processing, success, error

  useEffect(() => {
    const processCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setTimeout(() => {
          navigate('/');
        }, 3000);
        return;
      }

      if (!token) {
        setStatus('error');
        setTimeout(() => {
          navigate('/');
        }, 3000);
        return;
      }

      try {
        const success = await handleAuthCallback(token);
        if (success) {
          setStatus('success');
          setTimeout(() => {
            navigate('/dashboard');
          }, 2000);
        } else {
          setStatus('error');
          setTimeout(() => {
            navigate('/');
          }, 3000);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    processCallback();
  }, [searchParams, handleAuthCallback, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="card">
          <div className="card-body py-12">
            {status === 'processing' && (
              <>
                <LoadingSpinner size="lg" className="mb-4" />
                <h1 className="text-xl font-medium text-gray-900 mb-2">
                  Completing Sign In
                </h1>
                <p className="text-gray-500">
                  Processing your Airtable authentication...
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
                <h1 className="text-xl font-medium text-gray-900 mb-2">
                  Welcome to FormBuilder!
                </h1>
                <p className="text-gray-500 mb-4">
                  You've successfully connected your Airtable account.
                </p>
                <p className="text-sm text-gray-400">
                  Redirecting to your dashboard...
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
                <h1 className="text-xl font-medium text-gray-900 mb-2">
                  Authentication Failed
                </h1>
                <p className="text-gray-500 mb-4">
                  We couldn't complete your sign in. Please try again.
                </p>
                <p className="text-sm text-gray-400">
                  Redirecting back to home page...
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthCallback;