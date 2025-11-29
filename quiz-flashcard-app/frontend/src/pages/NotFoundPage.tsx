import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

function NotFoundPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-10 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* 404 Visual */}
        <div className="mb-8">
          <div className="text-9xl font-bold text-primary-200 dark:text-dark-surface-30">
            404
          </div>
          <div className="relative -mt-16">
            <div className="w-24 h-24 mx-auto bg-primary-100 dark:bg-dark-tonal-20 rounded-full flex items-center justify-center">
              <Search className="w-12 h-12 text-primary-500 dark:text-dark-primary-20" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Oops! The page you're looking for doesn't exist or has been moved.
          Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="btn-primary inline-flex items-center space-x-2"
          >
            <Home className="h-5 w-5" />
            <span>Go to Dashboard</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn-secondary inline-flex items-center space-x-2"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
