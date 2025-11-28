import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Hammer, Home, LogIn, LogOut, User, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

function Layout(): React.ReactElement {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Hammer className="h-8 w-8 text-primary-500" />
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-primary-700 leading-tight">
                    StudyForge
                  </span>
                  <span className="text-xs text-gray-500 hidden sm:block">
                    Craft smarter quizzes & flashcards
                  </span>
                </div>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-1 text-gray-600 hover:text-primary-500"
              >
                <Home className="h-5 w-5" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <Link
                to="/analytics"
                className="flex items-center space-x-1 text-gray-600 hover:text-primary-500"
              >
                <BarChart3 className="h-5 w-5" />
                <span className="hidden sm:inline">Analytics</span>
              </Link>

              {isLoading ? (
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
              ) : isAuthenticated && user ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary-600" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                      {user.name}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-gray-600 hover:text-red-500 text-sm"
                    title="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center space-x-1 text-gray-600 hover:text-primary-500"
                >
                  <LogIn className="h-5 w-5" />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
