import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TourProvider } from './contexts/TourContext';
import ErrorBoundary from './components/ErrorBoundary';
import TourOverlay from './components/TourOverlay';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import Home from './pages/Home';
import CategoryDashboard from './pages/CategoryDashboard';
import QuizPage from './pages/QuizPage';
import QuestionBank from './pages/QuestionBank';
import FlashcardsPage from './pages/FlashcardsPage';
import NotebookPage from './pages/NotebookPage';
import QuizSession from './pages/QuizSession';
import QuizResults from './pages/QuizResults';
import LoginPage from './pages/LoginPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import AchievementsPage from './pages/AchievementsPage';
import NotFoundPage from './pages/NotFoundPage';

function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ErrorProvider>
          <AuthProvider>
            <TourProvider>
              <Router>
              <TourOverlay />
              <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Home />} />
                <Route path="/analytics" element={<AnalyticsDashboard />} />
                <Route path="/achievements" element={<AchievementsPage />} />
                <Route path="/category/:categoryId" element={<CategoryDashboard />} />
                <Route path="/category/:categoryId/quiz" element={<QuizPage />} />
                <Route path="/category/:categoryId/quiz/session/:sessionId" element={<QuizSession />} />
                <Route path="/category/:categoryId/quiz/results/:sessionId" element={<QuizResults />} />
                <Route path="/category/:categoryId/question-bank" element={<QuestionBank />} />
                <Route path="/category/:categoryId/flashcards" element={<FlashcardsPage />} />
                <Route path="/category/:categoryId/notebook" element={<NotebookPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
              </Routes>
              </Router>
            </TourProvider>
          </AuthProvider>
        </ErrorProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
