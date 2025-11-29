import React, { useEffect, useState, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Flame, Download } from 'lucide-react';
import { useTour } from '../contexts/TourContext';
import { getTourSteps, TourStep } from '../config/tourSteps';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function TourOverlay(): React.ReactElement | null {
  const {
    activeTour,
    currentStep,
    showDetails,
    showTechnical,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    toggleDetails,
    toggleTechnical,
  } = useTour();

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const steps = activeTour ? getTourSteps(activeTour) : [];
  const step = steps[currentStep] as TourStep | undefined;
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Calculate position using viewport-relative coordinates (for fixed positioning)
  const updateTargetRect = useCallback(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(`[data-tour="${step.target}"]`);
    if (element) {
      const rect = element.getBoundingClientRect();
      // Use viewport-relative coordinates since we're using fixed positioning
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [step?.target]);

  // Find and measure target element
  useEffect(() => {
    if (!step?.target) {
      setTargetRect(null);
      return;
    }

    // Start animation
    setIsAnimating(true);

    const element = document.querySelector(`[data-tour="${step.target}"]`);
    if (element) {
      // Scroll element into view first
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Wait for scroll to complete, then update position
    const timeout = setTimeout(() => {
      updateTargetRect();
      setIsAnimating(false);
    }, 350);

    // Also update on scroll/resize
    const handleUpdate = () => {
      updateTargetRect();
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
    };
  }, [step?.target, currentStep, updateTargetRect]);

  // Position the card relative to target
  useEffect(() => {
    if (!cardRef.current) return;

    // Wait a frame to get accurate card dimensions
    requestAnimationFrame(() => {
      if (!cardRef.current) return;

      const cardRect = cardRef.current.getBoundingClientRect();
      const padding = 20;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (!targetRect || !step?.target) {
        // Center the card for modal steps
        setCardPosition({
          top: Math.max(padding, (viewportHeight - cardRect.height) / 2),
          left: Math.max(padding, (viewportWidth - cardRect.width) / 2),
        });
        return;
      }

      const position = step.position || 'bottom';
      let top = 0;
      let left = 0;

      // Calculate initial position based on preferred placement
      switch (position) {
        case 'top':
          top = targetRect.top - cardRect.height - padding;
          left = targetRect.left + (targetRect.width - cardRect.width) / 2;
          break;
        case 'bottom':
          top = targetRect.top + targetRect.height + padding;
          left = targetRect.left + (targetRect.width - cardRect.width) / 2;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height - cardRect.height) / 2;
          left = targetRect.left - cardRect.width - padding;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height - cardRect.height) / 2;
          left = targetRect.left + targetRect.width + padding;
          break;
      }

      // Check if card would be off-screen and adjust
      // If bottom placement would be cut off, try top
      if (position === 'bottom' && top + cardRect.height > viewportHeight - padding) {
        const topPosition = targetRect.top - cardRect.height - padding;
        if (topPosition >= padding) {
          top = topPosition;
        }
      }
      // If top placement would be cut off, try bottom
      if (position === 'top' && top < padding) {
        const bottomPosition = targetRect.top + targetRect.height + padding;
        if (bottomPosition + cardRect.height <= viewportHeight - padding) {
          top = bottomPosition;
        }
      }

      // Keep within viewport bounds (horizontal)
      left = Math.max(padding, Math.min(left, viewportWidth - cardRect.width - padding));

      // Keep within viewport bounds (vertical)
      top = Math.max(padding, Math.min(top, viewportHeight - cardRect.height - padding));

      setCardPosition({ top, left });
    });
  }, [targetRect, step?.position, step?.target, showDetails, showTechnical, currentStep]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeTour) return;

      switch (e.key) {
        case 'Escape':
          skipTour();
          break;
        case 'ArrowRight':
        case 'Enter':
          if (isLastStep) {
            completeTour();
          } else {
            nextStep();
          }
          break;
        case 'ArrowLeft':
          if (!isFirstStep) {
            prevStep();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTour, isLastStep, isFirstStep, nextStep, prevStep, skipTour, completeTour]);

  if (!activeTour || !step) return null;

  const handleDownload = (filename: string) => {
    const link = document.createElement('a');
    link.href = `/demo-assets/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate spotlight cutout position (using CSS clip-path for better performance)
  const spotlightStyle = targetRect ? {
    clipPath: `polygon(
      0% 0%,
      0% 100%,
      ${targetRect.left - 8}px 100%,
      ${targetRect.left - 8}px ${targetRect.top - 8}px,
      ${targetRect.left + targetRect.width + 8}px ${targetRect.top - 8}px,
      ${targetRect.left + targetRect.width + 8}px ${targetRect.top + targetRect.height + 8}px,
      ${targetRect.left - 8}px ${targetRect.top + targetRect.height + 8}px,
      ${targetRect.left - 8}px 100%,
      100% 100%,
      100% 0%
    )`,
  } : {};

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none" role="dialog" aria-modal="true">
      {/* Dark overlay with spotlight cutout */}
      <div
        className={`absolute inset-0 bg-black/70 pointer-events-auto transition-all duration-500 ease-out ${isAnimating ? 'opacity-50' : 'opacity-100'}`}
        style={spotlightStyle}
        onClick={skipTour}
      />

      {/* Highlight ring around target */}
      {targetRect && (
        <div
          className={`absolute rounded-lg pointer-events-none transition-all duration-500 ease-out ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)',
            border: '2px solid rgba(59, 130, 246, 0.8)',
          }}
        />
      )}

      {/* Tour Card */}
      <div
        ref={cardRef}
        className={`absolute bg-white dark:bg-dark-surface-20 rounded-xl shadow-2xl border border-gray-200 dark:border-dark-surface-30 w-[90vw] max-w-md overflow-hidden pointer-events-auto transition-all duration-500 ease-out ${isAnimating ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-surface-30 bg-gray-50 dark:bg-dark-surface-10">
          <h3 className="font-semibold text-gray-900 dark:text-white">{step.title}</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-dark-surface-50">
              {currentStep + 1} / {steps.length}
            </span>
            <button
              onClick={skipTour}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              title="Skip tour (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 max-h-[50vh] overflow-y-auto">
          <p className="text-gray-700 dark:text-gray-300 mb-3">{step.content}</p>

          {/* Demo Assets */}
          {step.demoAssets && step.demoAssets.length > 0 && (
            <div className="mb-4 p-3 bg-primary-50 dark:bg-dark-tonal-10 rounded-lg border border-primary-200 dark:border-dark-primary-10/30">
              <p className="text-sm font-medium text-primary-800 dark:text-dark-primary-20 mb-2">
                For Demo: Use our sample files
              </p>
              <div className="space-y-2">
                {step.demoAssets.map((asset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleDownload(asset.filename)}
                    className="flex items-center gap-2 text-sm text-primary-600 dark:text-dark-primary-30 hover:text-primary-800 dark:hover:text-dark-primary-10 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>{asset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Details Section */}
          {step.details && (
            <div className="mt-3">
              <button
                onClick={toggleDetails}
                className="flex items-center gap-1 text-sm font-medium text-primary-600 dark:text-dark-primary-20 hover:text-primary-800 dark:hover:text-dark-primary-10 transition-colors"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    <span>Hide Details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    <span>More Details</span>
                  </>
                )}
              </button>

              <div className={`overflow-hidden transition-all duration-300 ease-out ${showDetails ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                <div className="p-3 bg-gray-50 dark:bg-dark-surface-10 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {step.details}
                </div>

                {/* Technical/Show Off Mode Toggle */}
                {step.technicalDetails && (
                  <div className="mt-3">
                    <button
                      onClick={toggleTechnical}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        showTechnical
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-2 border-orange-300 dark:border-orange-700'
                          : 'bg-gray-100 dark:bg-dark-surface-30 text-gray-600 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 border-2 border-transparent'
                      }`}
                    >
                      <Flame className={`h-4 w-4 transition-colors ${showTechnical ? 'text-orange-500' : ''}`} />
                      <span>Show Off Mode</span>
                      {showTechnical && <span className="ml-1">ON</span>}
                    </button>

                    <div className={`overflow-hidden transition-all duration-300 ease-out ${showTechnical ? 'max-h-[400px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                      <div className="p-3 bg-gray-900 dark:bg-black rounded-lg border border-orange-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-bold text-orange-400">TECHNICAL DEEP DIVE</span>
                        </div>
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto max-h-[300px] overflow-y-auto">
                          {step.technicalDetails}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-dark-surface-30 bg-gray-50 dark:bg-dark-surface-10">
          <button
            onClick={skipTour}
            className="text-sm text-gray-500 dark:text-dark-surface-50 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={prevStep}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-dark-surface-30 transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={isLastStep ? completeTour : nextStep}
              className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-primary-600 dark:bg-dark-primary-10 hover:bg-primary-700 dark:hover:bg-dark-primary-20 rounded-lg transition-all duration-200"
            >
              <span>{isLastStep ? 'Get Started' : 'Next'}</span>
              {!isLastStep && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TourOverlay;
