import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Hammer, Home, LogIn, LogOut, User, BarChart3, Sun, Moon, HelpCircle, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTour } from '../contexts/TourContext';

function Layout(): React.ReactElement {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { startTour, resetTours } = useTour();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/dashboard');
  };

  const handleRestartTour = () => {
    // Determine which tour to start based on current page
    const path = location.pathname;
    if (path === '/dashboard') {
      resetTours();
      setTimeout(() => startTour('home'), 100);
    } else if (path.match(/^\/category\/\d+$/)) {
      // Extract category ID from path
      const categoryId = parseInt(path.split('/')[2]);
      startTour('category', categoryId);
    } else {
      // Default to home tour
      resetTours();
      setTimeout(() => startTour('home'), 100);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-surface-10 transition-colors">
      <nav className="bg-white dark:bg-dark-surface-20 shadow-sm border-b border-gray-200 dark:border-dark-surface-30 transition-colors sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex items-center space-x-2">
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

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <Link
                to="/dashboard"
                className="flex items-center space-x-1 text-gray-600 hover:text-primary-500 dark:text-dark-surface-60 dark:hover:text-dark-primary-20"
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </Link>
              <Link
                to="/analytics"
                className="flex items-center space-x-1 text-gray-600 hover:text-primary-500 dark:text-dark-surface-60 dark:hover:text-dark-primary-20"
              >
                <BarChart3 className="h-5 w-5" />
                <span>Analytics</span>
              </Link>

              {/* Help Button */}
              <button
                onClick={handleRestartTour}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-dark-surface-60 dark:hover:bg-dark-tonal-20 transition-colors"
                title="Restart guided tour"
              >
                <HelpCircle className="h-5 w-5" />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                data-tour="theme-toggle"
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
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-surface-60">
                      {user.name}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-gray-600 hover:text-red-500 dark:text-dark-surface-60 dark:hover:text-danger text-sm"
                    title="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center space-x-1 text-gray-600 hover:text-primary-500 dark:text-dark-surface-60 dark:hover:text-dark-primary-20"
                >
                  <LogIn className="h-5 w-5" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>

            {/* Mobile Navigation Controls */}
            <div className="flex md:hidden items-center space-x-2">
              {/* Theme Toggle - always visible on mobile */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-dark-primary-40 dark:hover:bg-dark-tonal-20 transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              {/* Hamburger Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-dark-surface-60 dark:hover:bg-dark-tonal-20 transition-colors"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-dark-surface-30 bg-white dark:bg-dark-surface-20">
            <div className="px-4 py-4 space-y-3">
              <Link
                to="/dashboard"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface-30 transition-colors"
              >
                <Home className="h-5 w-5" />
                <span className="font-medium">Home</span>
              </Link>
              <Link
                to="/analytics"
                onClick={closeMobileMenu}
                className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface-30 transition-colors"
              >
                <BarChart3 className="h-5 w-5" />
                <span className="font-medium">Analytics</span>
              </Link>
              <button
                onClick={() => { handleRestartTour(); closeMobileMenu(); }}
                className="flex items-center space-x-3 p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface-30 transition-colors w-full"
              >
                <HelpCircle className="h-5 w-5" />
                <span className="font-medium">Restart Tour</span>
              </button>

              <div className="border-t border-gray-200 dark:border-dark-surface-30 pt-3 mt-3">
                {isLoading ? (
                  <div className="flex items-center space-x-3 p-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-dark-surface-30 animate-pulse" />
                    <div className="h-4 w-24 bg-gray-200 dark:bg-dark-surface-30 rounded animate-pulse" />
                  </div>
                ) : isAuthenticated && user ? (
                  <>
                    <div className="flex items-center space-x-3 p-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.name} className="h-10 w-10 rounded-full" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-dark-tonal-20 flex items-center justify-center">
                          <User className="h-6 w-6 text-primary-600 dark:text-dark-primary-20" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => { handleLogout(); closeMobileMenu(); }}
                      className="flex items-center space-x-3 p-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full mt-2"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="flex items-center space-x-3 p-3 rounded-lg text-primary-600 dark:text-dark-primary-20 hover:bg-primary-50 dark:hover:bg-dark-tonal-20 transition-colors"
                  >
                    <LogIn className="h-5 w-5" />
                    <span className="font-medium">Sign In</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
