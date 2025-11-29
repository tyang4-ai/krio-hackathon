import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Hammer, Home, LogIn, LogOut, User, BarChart3, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

function Layout(): React.ReactElement {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-10 transition-colors">
      <nav className="bg-white dark:bg-dark-surface-20 shadow-sm border-b border-gray-200 dark:border-dark-surface-30 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <Hammer className="h-8 w-8 text-primary-500 dark:text-dark-primary-10" />
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-primary-700 dark:text-dark-primary-30 leading-tight">
                    StudyForge
                  </span>
                  <span className="text-xs text-gray-500 dark:text-dark-surface-50 hidden sm:block">
                    Craft smarter quizzes & flashcards
                  </span>
                </div>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center space-x-1 text-gray-600 hover:text-primary-500 dark:text-dark-surface-60 dark:hover:text-dark-primary-20"
              >
                <Home className="h-5 w-5" />
                <span className="hidden sm:inline">Home</span>
              </Link>
              <Link
                to="/analytics"
                className="flex items-center space-x-1 text-gray-600 hover:text-primary-500 dark:text-dark-surface-60 dark:hover:text-dark-primary-20"
              >
                <BarChart3 className="h-5 w-5" />
                <span className="hidden sm:inline">Analytics</span>
              </Link>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-dark-primary-40 dark:hover:bg-dark-tonal-20 transition-colors"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              {isLoading ? (
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-dark-surface-30 animate-pulse" />
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
                      <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-dark-tonal-20 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary-600 dark:text-dark-primary-20" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-surface-60 hidden sm:inline">
                      {user.name}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-gray-600 hover:text-red-500 dark:text-dark-surface-60 dark:hover:text-danger text-sm"
                    title="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center space-x-1 text-gray-600 hover:text-primary-500 dark:text-dark-surface-60 dark:hover:text-dark-primary-20"
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
