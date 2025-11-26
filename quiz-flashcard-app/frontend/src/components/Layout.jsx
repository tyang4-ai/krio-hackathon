import React from 'react';
import { Link } from 'react-router-dom';
import { Hammer, Home } from 'lucide-react';

function Layout({ children }) {
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
