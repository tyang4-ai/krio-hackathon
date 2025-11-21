import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Home } from 'lucide-react';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-primary-500" />
                <span className="text-xl font-bold text-primary-700">
                  Scholarly
                </span>
              </Link>
            </div>
            <div className="flex items-center">
              <Link
                to="/"
                className="flex items-center space-x-1 text-gray-600 hover:text-primary-500"
              >
                <Home className="h-5 w-5" />
                <span>Home</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

export default Layout;
