import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type TourName = 'home' | 'category' | 'analytics';

interface ToursCompleted {
  home: boolean;
  category: boolean; // Only tracks if user has seen the category tour once (any category)
  analytics: boolean;
}

interface TourState {
  activeTour: TourName | null;
  currentStep: number;
  showDetails: boolean;
  showTechnical: boolean;
  toursCompleted: ToursCompleted;
}

interface TourContextType {
  activeTour: TourName | null;
  currentStep: number;
  showDetails: boolean;
  showTechnical: boolean;
  startTour: (name: TourName, categoryId?: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  toggleDetails: () => void;
  toggleTechnical: () => void;
  resetTours: () => void;
  restartCurrentPageTour: () => void;
  isTourCompleted: (name: TourName, categoryId?: number) => boolean;
  currentCategoryId: number | null;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

const STORAGE_KEY = 'studyforge_tours';

const DEFAULT_STATE: TourState = {
  activeTour: null,
  currentStep: 0,
  showDetails: false,
  showTechnical: false,
  toursCompleted: {
    home: false,
    category: false,
    analytics: false,
  },
};

function loadPersistedState(): ToursCompleted {
  if (typeof window === 'undefined') {
    return DEFAULT_STATE.toursCompleted;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load tour state:', e);
  }
  return DEFAULT_STATE.toursCompleted;
}

function persistState(completed: ToursCompleted): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completed));
  } catch (e) {
    console.error('Failed to persist tour state:', e);
  }
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TourState>(() => ({
    ...DEFAULT_STATE,
    toursCompleted: loadPersistedState(),
  }));
  const [currentCategoryId, setCurrentCategoryId] = useState<number | null>(null);

  // Persist completed tours to localStorage
  useEffect(() => {
    persistState(state.toursCompleted);
  }, [state.toursCompleted]);

  const startTour = useCallback((name: TourName, categoryId?: number) => {
    if (categoryId !== undefined) {
      setCurrentCategoryId(categoryId);
    }
    setState(prev => ({
      ...prev,
      activeTour: name,
      currentStep: 0,
      showDetails: false,
      showTechnical: false,
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: prev.currentStep + 1,
      showDetails: false,
      showTechnical: false,
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentStep: Math.max(0, prev.currentStep - 1),
      showDetails: false,
      showTechnical: false,
    }));
  }, []);

  const completeTour = useCallback(() => {
    setState(prev => {
      const newCompleted = { ...prev.toursCompleted };
      if (prev.activeTour === 'home') {
        newCompleted.home = true;
      } else if (prev.activeTour === 'category') {
        newCompleted.category = true;
      } else if (prev.activeTour === 'analytics') {
        newCompleted.analytics = true;
      }
      return {
        ...prev,
        activeTour: null,
        currentStep: 0,
        showDetails: false,
        showTechnical: false,
        toursCompleted: newCompleted,
      };
    });
    setCurrentCategoryId(null);
  }, []);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const toggleDetails = useCallback(() => {
    setState(prev => ({
      ...prev,
      showDetails: !prev.showDetails,
    }));
  }, []);

  const toggleTechnical = useCallback(() => {
    setState(prev => ({
      ...prev,
      showTechnical: !prev.showTechnical,
    }));
  }, []);

  const resetTours = useCallback(() => {
    setState({
      ...DEFAULT_STATE,
      toursCompleted: {
        home: false,
        category: false,
        analytics: false,
      },
    });
    setCurrentCategoryId(null);
  }, []);

  const restartCurrentPageTour = useCallback(() => {
    // This will be called from Layout - the actual tour to start
    // will be determined by the current page
    setState(prev => ({
      ...prev,
      activeTour: null,
      currentStep: 0,
      showDetails: false,
      showTechnical: false,
    }));
  }, []);

  const isTourCompleted = useCallback((name: TourName, _categoryId?: number): boolean => {
    if (name === 'home') {
      return state.toursCompleted.home;
    }
    if (name === 'category') {
      return state.toursCompleted.category;
    }
    if (name === 'analytics') {
      return state.toursCompleted.analytics;
    }
    return false;
  }, [state.toursCompleted]);

  return (
    <TourContext.Provider
      value={{
        activeTour: state.activeTour,
        currentStep: state.currentStep,
        showDetails: state.showDetails,
        showTechnical: state.showTechnical,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        completeTour,
        toggleDetails,
        toggleTechnical,
        resetTours,
        restartCurrentPageTour,
        isTourCompleted,
        currentCategoryId,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}

export default TourContext;
