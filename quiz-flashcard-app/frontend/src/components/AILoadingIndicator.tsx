import React from 'react';
import { Brain, FileText, Sparkles, CheckCircle, Loader2 } from 'lucide-react';

export type AILoadingStage = 'extracting' | 'analyzing' | 'generating' | 'validating' | 'complete';

interface AILoadingIndicatorProps {
  isVisible: boolean;
  progress: number;
  currentStage?: AILoadingStage;
  contentType?: 'questions' | 'flashcards' | 'analysis';
  count?: number;
}

const stages: Record<AILoadingStage, { label: string; icon: React.ElementType }> = {
  extracting: { label: 'Extracting content from documents...', icon: FileText },
  analyzing: { label: 'Analyzing key concepts...', icon: Brain },
  generating: { label: 'Generating content...', icon: Sparkles },
  validating: { label: 'Validating and refining...', icon: CheckCircle },
  complete: { label: 'Complete!', icon: CheckCircle },
};

const stageOrder: AILoadingStage[] = ['extracting', 'analyzing', 'generating', 'validating', 'complete'];

function AILoadingIndicator({
  isVisible,
  progress,
  currentStage = 'generating',
  contentType = 'questions',
  count,
}: AILoadingIndicatorProps): React.ReactElement | null {
  if (!isVisible) return null;

  const currentStageIndex = stageOrder.indexOf(currentStage);
  const contentLabel = contentType === 'flashcards' ? 'flashcards' : contentType === 'analysis' ? 'patterns' : 'questions';

  return (
    <div className="bg-gradient-to-r from-primary-50 to-purple-50 dark:from-dark-tonal-10 dark:to-purple-900/20 border border-primary-200 dark:border-dark-surface-30 rounded-xl p-6 mb-6">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="relative">
          <div className="w-12 h-12 bg-primary-100 dark:bg-dark-tonal-20 rounded-full flex items-center justify-center">
            <Brain className="h-6 w-6 text-primary-600 dark:text-dark-primary-20 animate-pulse" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            AI is working on your {contentLabel}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {count ? `Generating ${count} ${contentLabel}...` : 'Please wait while we process your content...'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
          <span>{stages[currentStage].label}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-dark-surface-30 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-purple-500 dark:from-dark-primary-10 dark:to-purple-500 transition-all duration-300 relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="flex justify-between">
        {stageOrder.slice(0, -1).map((stage, index) => {
          const StageIcon = stages[stage].icon;
          const isComplete = index < currentStageIndex;
          const isCurrent = index === currentStageIndex;

          return (
            <div
              key={stage}
              className={`flex flex-col items-center ${
                isComplete
                  ? 'text-green-600 dark:text-green-400'
                  : isCurrent
                  ? 'text-primary-600 dark:text-dark-primary-20'
                  : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                  isComplete
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : isCurrent
                    ? 'bg-primary-100 dark:bg-dark-tonal-20'
                    : 'bg-gray-100 dark:bg-dark-surface-30'
                }`}
              >
                {isComplete ? (
                  <CheckCircle className="h-4 w-4" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <StageIcon className="h-4 w-4" />
                )}
              </div>
              <span className="text-xs hidden sm:block capitalize">
                {stage.replace('ing', '')}
              </span>
            </div>
          );
        })}
      </div>

      {/* Fun fact / tip */}
      <div className="mt-4 pt-4 border-t border-primary-200 dark:border-dark-surface-30">
        <p className="text-xs text-gray-500 dark:text-gray-400 italic text-center">
          {contentType === 'flashcards'
            ? '💡 Tip: Spaced repetition helps you retain information 50% better than cramming!'
            : contentType === 'analysis'
            ? '🧠 The AI is learning your question style for better generation!'
            : '✨ AI-generated questions are tailored to your study material.'}
        </p>
      </div>
    </div>
  );
}

// Add shimmer animation to tailwind - this would go in CSS but we can use inline
const shimmerStyle = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.animate-shimmer {
  animation: shimmer 1.5s infinite;
}
`;

// Inject the style
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = shimmerStyle;
  if (!document.head.querySelector('[data-ai-loading-styles]')) {
    styleEl.setAttribute('data-ai-loading-styles', 'true');
    document.head.appendChild(styleEl);
  }
}

export default AILoadingIndicator;
