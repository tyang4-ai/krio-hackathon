import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import CategoryDashboard from './pages/CategoryDashboard';
import QuizPage from './pages/QuizPage';
import FlashcardsPage from './pages/FlashcardsPage';
import NotebookPage from './pages/NotebookPage';
import QuizSession from './pages/QuizSession';
import QuizResults from './pages/QuizResults';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/category/:categoryId" element={<CategoryDashboard />} />
          <Route path="/category/:categoryId/quiz" element={<QuizPage />} />
          <Route path="/category/:categoryId/quiz/session/:sessionId" element={<QuizSession />} />
          <Route path="/category/:categoryId/quiz/results/:sessionId" element={<QuizResults />} />
          <Route path="/category/:categoryId/flashcards" element={<FlashcardsPage />} />
          <Route path="/category/:categoryId/notebook" element={<NotebookPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
