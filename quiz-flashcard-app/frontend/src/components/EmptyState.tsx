import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  HelpCircle,
  BookOpen,
  ClipboardList,
  FolderOpen,
  Upload,
  Sparkles,
  Plus,
  type LucideIcon,
} from 'lucide-react';

export type EmptyStateType =
  | 'documents'
  | 'questions'
  | 'flashcards'
  | 'notebook'
  | 'categories'
  | 'custom';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick?: () => void;
    to?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    to?: string;
  };
}

const presets: Record<
  Exclude<EmptyStateType, 'custom'>,
  { icon: LucideIcon; title: string; description: string }
> = {
  documents: {
    icon: FileText,
    title: 'No documents yet',
    description: 'Upload PDFs, Word docs, or text files to get started. AI will analyze your content and help you create study materials.',
  },
  questions: {
    icon: HelpCircle,
    title: 'No questions available',
    description: 'Generate questions from your uploaded documents, or add questions manually to build your question bank.',
  },
  flashcards: {
    icon: BookOpen,
    title: 'No flashcards yet',
    description: 'Create flashcards from your documents to study with spaced repetition. Learning has never been easier!',
  },
  notebook: {
    icon: ClipboardList,
    title: 'Notebook is empty',
    description: 'Questions you get wrong will appear here for review. Take a quiz to start tracking your progress!',
  },
  categories: {
    icon: FolderOpen,
    title: 'No categories yet',
    description: 'Create your first category to organize your study materials. Each category can hold documents, questions, and flashcards.',
  },
};

function EmptyState({
  type = 'custom',
  title,
  description,
  icon: CustomIcon,
  action,
  secondaryAction,
}: EmptyStateProps): React.ReactElement {
  const preset = type !== 'custom' ? presets[type] : null;
  const Icon = CustomIcon || preset?.icon || FileText;
  const displayTitle = title || preset?.title || 'Nothing here yet';
  const displayDescription = description || preset?.description || 'Get started by adding some content.';

  const renderAction = (
    actionConfig: { label: string; onClick?: () => void; to?: string },
    isPrimary: boolean
  ) => {
    const className = isPrimary
      ? 'btn-primary inline-flex items-center space-x-2'
      : 'btn-secondary inline-flex items-center space-x-2';

    const ActionIcon = isPrimary
      ? type === 'documents'
        ? Upload
        : type === 'questions' || type === 'flashcards'
        ? Sparkles
        : Plus
      : null;

    if (actionConfig.to) {
      return (
        <Link to={actionConfig.to} className={className}>
          {ActionIcon && <ActionIcon className="h-4 w-4" />}
          <span>{actionConfig.label}</span>
        </Link>
      );
    }

    return (
      <button onClick={actionConfig.onClick} className={className}>
        {ActionIcon && <ActionIcon className="h-4 w-4" />}
        <span>{actionConfig.label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Icon with decorative background */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary-100 dark:bg-dark-tonal-20 rounded-full blur-xl opacity-60" />
        <div className="relative w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-50 dark:from-dark-tonal-20 dark:to-dark-surface-30 rounded-full flex items-center justify-center">
          <Icon className="h-10 w-10 text-primary-500 dark:text-dark-primary-20" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
        {displayTitle}
      </h3>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
        {displayDescription}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action && renderAction(action, true)}
          {secondaryAction && renderAction(secondaryAction, false)}
        </div>
      )}

      {/* Decorative dots */}
      <div className="flex items-center space-x-1 mt-8">
        <div className="w-2 h-2 rounded-full bg-primary-200 dark:bg-dark-tonal-20" />
        <div className="w-2 h-2 rounded-full bg-primary-300 dark:bg-dark-primary-30" />
        <div className="w-2 h-2 rounded-full bg-primary-200 dark:bg-dark-tonal-20" />
      </div>
    </div>
  );
}

export default EmptyState;
