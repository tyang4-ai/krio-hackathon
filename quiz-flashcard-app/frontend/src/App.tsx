import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ErrorProvider } from './contexts/ErrorContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
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

function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ErrorProvider>
          <AuthProvider>
            <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/analytics" element={<AnalyticsDashboard />} />
                <Route path="/category/:categoryId" element={<CategoryDashboard />} />
                <Route path="/category/:categoryId/quiz" element={<QuizPage />} />
                <Route path="/category/:categoryId/quiz/session/:sessionId" element={<QuizSession />} />
                <Route path="/category/:categoryId/quiz/results/:sessionId" element={<QuizResults />} />
                <Route path="/category/:categoryId/question-bank" element={<QuestionBank />} />
                <Route path="/category/:categoryId/flashcards" element={<FlashcardsPage />} />
                <Route path="/category/:categoryId/notebook" element={<NotebookPage />} />
              </Route>
            </Routes>
            </Router>
          </AuthProvider>
        </ErrorProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
