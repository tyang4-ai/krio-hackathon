import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Folder, FileText, HelpCircle, BookOpen, Trash2, BarChart3 } from 'lucide-react';
import { categoryApi } from '../services/api';
import type { Category } from '../types';

interface CategoryStats {
  document_count?: number;
  question_count?: number;
  flashcard_count?: number;
}

interface CategoryWithStats extends Category {
  stats?: CategoryStats;
}

function Home(): React.ReactElement {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [newCategory, setNewCategory] = useState<Partial<Category> & { color?: string }>({
    name: '',
    description: '',
    color: '#033B4C'
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async (): Promise<void> => {
    try {
      const response = await categoryApi.getAll();
      // Handle both wrapped and unwrapped response formats
      const data = response.data.data || response.data;
      setCategories(data.categories || data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (): Promise<void> => {
    if (!newCategory.name?.trim()) {
      alert('Please enter a category name');
      return;
    }
    try {
      await categoryApi.create(newCategory);
      setShowModal(false);
      setNewCategory({ name: '', description: '', color: '#033B4C' });
      loadCategories();
    } catch (error: any) {
      console.error('Error creating category:', error);
      alert('Error creating category: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteCategory = async (id: number, e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this category? All data will be lost.')) {
      try {
        await categoryApi.delete(id);
        loadCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Categories</h1>
          <p className="text-gray-600 mt-1">Organize your study materials by class or subject</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/analytics"
            className="btn-secondary flex items-center space-x-2"
          >
            <BarChart3 className="h-5 w-5" />
            <span>Analytics</span>
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>New Category</span>
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 card">
          <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No categories yet</h3>
          <p className="text-gray-600 mb-4">Create your first category to get started</p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            Create Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.id}`}
              className="card hover:shadow-md transition-shadow relative group"
            >
              <button
                onClick={(e) => handleDeleteCategory(category.id, e)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: (category as any).color + '20' }}
              >
                <Folder className="h-6 w-6" style={{ color: (category as any).color }} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{category.name}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {category.description || 'No description'}
              </p>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <div className="flex items-center justify-center text-gray-400 mb-1">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-medium text-gray-900">{category.stats?.document_count || 0}</div>
                  <div className="text-xs text-gray-500">Docs</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-gray-400 mb-1">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-medium text-gray-900">{category.stats?.question_count || 0}</div>
                  <div className="text-xs text-gray-500">Questions</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-gray-400 mb-1">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-medium text-gray-900">{category.stats?.flashcard_count || 0}</div>
                  <div className="text-xs text-gray-500">Cards</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-md relative z-50" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Create New Category</h2>
            <form onSubmit={handleCreateCategory}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={newCategory.name || ''}
                    onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                    placeholder="e.g., Biology 101"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    value={newCategory.description || ''}
                    onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                    placeholder="Brief description of the category"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    className="w-full h-10 rounded cursor-pointer"
                    value={newCategory.color || '#033B4C'}
                    onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  className="btn-primary"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
