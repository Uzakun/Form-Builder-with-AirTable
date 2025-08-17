import {
    ArrowRight,
    BarChart3,
    Check,
    FileText,
    Shield,
    Sparkles,
    Star,
    Users,
    Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

const Landing = () => {
  const { loginWithAirtable, loading, isAuthenticated } = useAuth();

  const features = [
    {
      name: 'Airtable Integration',
      description: 'Connect directly to your Airtable bases and sync form responses automatically.',
      icon: Zap,
    },
    {
      name: 'Conditional Logic',
      description: 'Show or hide form fields based on user responses with powerful conditional logic.',
      icon: FileText,
    },
    {
      name: 'Real-time Analytics',
      description: 'Track form performance, conversion rates, and response analytics in real-time.',
      icon: BarChart3,
    },
    {
      name: 'Multiple Field Types',
      description: 'Support for text, select, multi-select, and file upload fields from Airtable.',
      icon: Users,
    },
    {
      name: 'Secure & Reliable',
      description: 'Enterprise-grade security with OAuth authentication and encrypted data transfer.',
      icon: Shield,
    },
    {
      name: 'Export & Reports',
      description: 'Export responses as CSV, generate PDF reports, and comprehensive analytics.',
      icon: Sparkles,
    },
  ];

  const testimonials = [
    {
      content: "This form builder has revolutionized how we collect data. The Airtable integration is seamless!",
      author: "Sarah Johnson",
      role: "Product Manager",
      company: "TechCorp"
    },
    {
      content: "The conditional logic feature saved us hours of development time. Highly recommended!",
      author: "Mike Chen",
      role: "Developer",
      company: "StartupXYZ"
    },
    {
      content: "Beautiful forms, powerful features, and excellent analytics. Everything we needed in one place.",
      author: "Emily Davis",
      role: "Marketing Director",
      company: "GrowthCo"
    }
  ];

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome back!</h1>
          <p className="text-xl text-gray-600 mb-8">Ready to create amazing forms?</p>
          <Link
            to="/dashboard"
            className="btn btn-primary btn-lg"
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="relative bg-gradient-to-br from-primary-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6 md:justify-start md:space-x-10">
            <div className="flex justify-start lg:w-0 lg:flex-1">
              <span className="text-2xl font-bold text-primary-600">
                FormBuilder
              </span>
            </div>
            <div className="md:flex items-center justify-end md:flex-1 lg:w-0">
              <button
                onClick={loginWithAirtable}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? (
                  <LoadingSpinner size="sm" color="white" />
                ) : (
                  <>
                    Login with Airtable
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 to-purple-50 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
              <span className="block">Build Dynamic Forms</span>
              <span className="block text-gradient">Connected to Airtable</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Create powerful, conditional forms that sync directly with your Airtable bases. 
              Collect responses, analyze data, and streamline your workflow.
            </p>
            <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
              <div className="rounded-md shadow">
                <button
                  onClick={loginWithAirtable}
                  disabled={loading}
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 md:py-4 md:text-lg md:px-10 transition-colors"
                >
                  {loading ? (
                    <LoadingSpinner size="sm" color="white" />
                  ) : (
                    <>
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="mt-6 flex justify-center items-center space-x-6 text-sm text-gray-500">
              <div className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-1" />
                No credit card required
              </div>
              <div className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-1" />
                Free forever plan
              </div>
              <div className="flex items-center">
                <Check className="h-4 w-4 text-green-500 mr-1" />
                5-minute setup
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-base text-primary-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to build amazing forms
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              Powerful features that make form building simple and data collection seamless.
            </p>
          </div>

          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.name} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-200"></div>
                    <div className="relative p-6 bg-white ring-1 ring-gray-900/5 rounded-lg leading-none flex items-top justify-start space-x-6">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white">
                          <Icon className="h-6 w-6" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium text-gray-900">{feature.name}</h3>
                        <p className="mt-2 text-base text-gray-500">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Trusted by teams worldwide
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              See what our customers have to say about FormBuilder
            </p>
          </div>
          
          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg shadow-soft p-6">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-gray-900 mb-4">
                  "{testimonial.content}"
                </blockquote>
                <div>
                  <div className="font-medium text-gray-900">{testimonial.author}</div>
                  <div className="text-gray-500">{testimonial.role}, {testimonial.company}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to dive in?</span>
            <span className="block text-primary-200">Start building forms today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <button
                onClick={loginWithAirtable}
                disabled={loading}
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 transition-colors"
              >
                {loading ? (
                  <LoadingSpinner size="sm" color="primary" />
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <span className="text-gray-400 hover:text-gray-500">
              Built with ❤️ for form builders everywhere
            </span>
          </div>
          <div className="mt-8 md:mt-0 md:order-1">
            <p className="text-center text-base text-gray-400">
              &copy; 2024 FormBuilder. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;