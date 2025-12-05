import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Folder,
  FileText,
  HelpCircle,
  BookOpen,
  Trash2,
  BarChart3,
  Edit2,
  X,
  TrendingUp,
  Clock,
  Target,
  Trophy,
  // Category icons
  GraduationCap,
  BookMarked,
  Beaker,
  Calculator,
  Globe,
  Music,
  Palette,
  Code,
  Heart,
  Brain,
  Atom,
  Languages,
  Scale,
  Landmark,
  Microscope,
  PenTool,
  Camera,
  Leaf,
  Dumbbell,
  DollarSign,
  type LucideIcon,
} from 'lucide-react';
import { categoryApi, analyticsApi } from '../services/api';
import { useError } from '../contexts/ErrorContext';
import { useTour } from '../contexts/TourContext';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/EmptyState';
import type { Category } from '../types';

// Icon mapping for category icons
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Folder,
  GraduationCap,
  BookMarked,
  Beaker,
  Calculator,
  Globe,
  Music,
  Palette,
  Code,
  Heart,
  Brain,
  Atom,
  Languages,
  Scale,
  Landmark,
  Microscope,
  PenTool,
  Camera,
  Leaf,
  Dumbbell,
  DollarSign,
};

// Get the list of available icon names
const AVAILABLE_ICONS = Object.keys(CATEGORY_ICONS);

interface CategoryStats {
  document_count?: number;
  question_count?: number;
  flashcard_count?: number;
}

interface CategoryWithStats extends Category {
  stats?: CategoryStats;
}

interface CategoryFormData {
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface QuickStats {
  totalQuestions: number;
  totalFlashcards: number;
  quizzesTaken: number;
  learningScore: number | null;
}

const DEFAULT_FORM_DATA: CategoryFormData = {
  name: '',
  description: '',
  color: '#033B4C',
  icon: 'Folder',
};

function Home(): React.ReactElement {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithStats | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(DEFAULT_FORM_DATA);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const { showSuccess, showWarning, handleApiError } = useError();
  const { startTour, isTourCompleted, activeTour } = useTour();
  const { user, isAuthenticated } = useAuth();

  // Re-fetch data when auth state changes (login/logout)
  useEffect(() => {
    loadCategories();
  }, [user, isAuthenticated]);

  // Start home tour on first visit (after loading)
  useEffect(() => {
    if (!loading && !isTourCompleted('home') && !activeTour) {
      // Small delay to ensure DOM is ready
      const timeout = setTimeout(() => {
        startTour('home');
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [loading, isTourCompleted, startTour, activeTour]);

  const loadCategories = async (): Promise<void> => {
    try {
      const [catResponse, analyticsResponse] = await Promise.all([
        categoryApi.getAll(),
        analyticsApi.getDashboard().catch((err) => {
          console.error('Analytics unavailable:', err);
          return null;
        }),
      ]);

      const catData = catResponse.data.data || catResponse.data;
      setCategories(catData.categories || catData || []);

      // Calculate quick stats from categories and analytics
      if (analyticsResponse) {
        const analytics = analyticsResponse.data.data || analyticsResponse.data;
        setQuickStats({
          totalQuestions: analytics.total_questions || analytics.totalQuestions || 0,
          totalFlashcards: analytics.total_flashcards || analytics.totalFlashcards || 0,
          quizzesTaken: analytics.total_quizzes || analytics.totalQuizzes || analytics.quizzes_taken || 0,
          learningScore: analytics.learning_score?.total_score ?? analytics.learningScore?.total_score ?? null,
        });
      } else {
        // Calculate from categories if analytics fails
        const cats = catData.categories || catData || [];
        const totals = cats.reduce(
          (acc: { questions: number; flashcards: number }, cat: CategoryWithStats) => ({
            questions: acc.questions + (cat.stats?.question_count || 0),
            flashcards: acc.flashcards + (cat.stats?.flashcard_count || 0),
          }),
          { questions: 0, flashcards: 0 }
        );
        setQuickStats({
          totalQuestions: totals.questions,
          totalFlashcards: totals.flashcards,
          quizzesTaken: 0,
          learningScore: null,
        });
      }
    } catch (error) {
      handleApiError(error, 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = (): void => {
    setEditingCategory(null);
    setFormData(DEFAULT_FORM_DATA);
    setShowModal(true);
  };

  const openEditModal = (category: CategoryWithStats, e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color || '#033B4C',
      icon: category.icon || 'Folder',
    });
    setShowModal(true);
  };

  const closeModal = (): void => {
    setShowModal(false);
    setEditingCategory(null);
    setFormData(DEFAULT_FORM_DATA);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!formData.name.trim()) {
      showWarning('Validation Error', 'Please enter a category name');
      return;
    }

    try {
      if (editingCategory) {
        // Update existing category
        await categoryApi.update(editingCategory.id, formData);
        showSuccess('Category Updated', `"${formData.name}" has been updated successfully`);
      } else {
        // Create new category
        await categoryApi.create(formData);
        showSuccess('Category Created', `"${formData.name}" has been created successfully`);
      }
      closeModal();
      loadCategories();
    } catch (error) {
      handleApiError(error, editingCategory ? 'Failed to update category' : 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (id: number, e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this category? All data will be lost.')) {
      try {
        await categoryApi.delete(id);
        showSuccess('Category Deleted', 'The category has been deleted');
        loadCategories();
      } catch (error) {
        handleApiError(error, 'Failed to delete category');
      }
    }
  };

  // Get the icon component for a category
  const getCategoryIcon = (iconName?: string): LucideIcon => {
    return CATEGORY_ICONS[iconName || 'Folder'] || Folder;
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
      {/* Quick Stats Section */}
      {quickStats && categories.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-dark-surface-20 rounded-xl p-4 border border-gray-100 dark:border-dark-surface-30 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-dark-tonal-20 rounded-lg flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-primary-600 dark:text-dark-primary-20" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{quickStats.totalQuestions}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Questions</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-surface-20 rounded-xl p-4 border border-gray-100 dark:border-dark-surface-30 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gold-100 dark:bg-gold-900/30 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-gold-600 dark:text-gold-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{quickStats.totalFlashcards}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Flashcards</div>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-dark-surface-20 rounded-xl p-4 border border-gray-100 dark:border-dark-surface-30 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{quickStats.quizzesTaken}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Quizzes Taken</div>
              </div>
            </div>
          </div>
          <Link
            to="/analytics"
            className="bg-gradient-to-br from-primary-500 to-primary-600 dark:from-dark-primary-10 dark:to-dark-primary-20 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {quickStats.learningScore !== null ? Math.round(quickStats.learningScore) : '--'}
                </div>
                <div className="text-xs text-white/80">Learning Score</div>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Your Categories</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Organize your study materials by class or subject</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/achievements"
            className="btn-secondary flex items-center space-x-2"
          >
            <Trophy className="h-5 w-5" />
            <span className="hidden sm:inline">Achievements</span>
          </Link>
          <Link
            to="/analytics"
            data-tour="analytics-btn"
            className="btn-secondary flex items-center space-x-2"
          >
            <BarChart3 className="h-5 w-5" />
            <span className="hidden sm:inline">Analytics</span>
          </Link>
          <button
            onClick={openCreateModal}
            data-tour="new-category-btn"
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">New Category</span>
          </button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="card">
          <EmptyState
            type="categories"
            action={{ label: 'Create Category', onClick: openCreateModal }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category, index) => {
            const IconComponent = getCategoryIcon(category.icon);
            return (
              <Link
                key={category.id}
                to={`/category/${category.id}`}
                data-tour={index === 0 ? 'category-card' : undefined}
                className="card hover:shadow-md transition-shadow relative group"
              >
                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => openEditModal(category, e)}
                    className="p-2 text-gray-400 hover:text-primary-600 dark:hover:text-dark-primary-20"
                    title="Edit category"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteCategory(category.id, e)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-danger"
                    title="Delete category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Category icon */}
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: (category.color || '#033B4C') + '20' }}
                >
                  <IconComponent className="h-6 w-6" style={{ color: category.color || '#033B4C' }} />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{category.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {category.description || 'No description'}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-dark-surface-30">
                  <div className="text-center">
                    <div className="flex items-center justify-center text-gray-400 dark:text-dark-surface-50 mb-1">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{category.stats?.document_count || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-dark-surface-50">Docs</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center text-gray-400 dark:text-dark-surface-50 mb-1">
                      <HelpCircle className="h-4 w-4" />
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{category.stats?.question_count || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-dark-surface-50">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center text-gray-400 dark:text-dark-surface-50 mb-1">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{category.stats?.flashcard_count || 0}</div>
                    <div className="text-xs text-gray-500 dark:text-dark-surface-50">Cards</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create/Edit Category Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-dark-surface-20 rounded-xl p-6 w-full max-w-lg relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Biology 101"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the category"
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="w-12 h-10 rounded cursor-pointer border-0"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                  <input
                    type="text"
                    className="input flex-1"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    placeholder="#033B4C"
                  />
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {AVAILABLE_ICONS.map((iconName) => {
                    const Icon = CATEGORY_ICONS[iconName];
                    const isSelected = formData.icon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: iconName })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50 dark:bg-dark-tonal-20 dark:border-dark-primary-10'
                            : 'border-gray-200 dark:border-dark-surface-30 hover:border-gray-300 dark:hover:border-dark-surface-40'
                        }`}
                        title={iconName}
                      >
                        <Icon
                          className="h-5 w-5 mx-auto"
                          style={{ color: isSelected ? formData.color : undefined }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preview
                </label>
                <div className="p-4 rounded-lg border border-gray-200 dark:border-dark-surface-30 bg-gray-50 dark:bg-dark-surface-10">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: formData.color + '20' }}
                    >
                      {(() => {
                        const PreviewIcon = getCategoryIcon(formData.icon);
                        return <PreviewIcon className="h-6 w-6" style={{ color: formData.color }} />;
                      })()}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formData.name || 'Category Name'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-dark-surface-50">
                        {formData.description || 'Category description'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-dark-surface-30">
              <button
                type="button"
                onClick={closeModal}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-primary"
              >
                {editingCategory ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
