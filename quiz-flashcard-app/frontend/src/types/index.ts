// User and Authentication types
export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// Core entities
export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface Document {
  id: number;
  category_id: number;
  filename: string;
  original_name: string;
  file_type: string;
  chapter?: string;
  uploaded_at: string;
  content_length?: number;
}

export type QuestionType = 'multiple_choice' | 'true_false' | 'written' | 'fill_in_blank';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: number;
  category_id: number;
  document_id?: number;
  question_text: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  options?: string[];
  correct_answer: string;
  explanation?: string;
  tags?: string[];
  rating?: number;
  chapter?: string;
  created_at?: string;
}

export interface Flashcard {
  id: number;
  category_id: number;
  document_id?: number;
  front_text: string;
  back_text: string;
  difficulty: Difficulty;
  tags?: string[];
  rating?: number;
  chapter?: string;
  created_at?: string;
}

export type QuizMode = 'practice' | 'timed' | 'exam';
export type TimerType = 'total' | 'per_question';

export interface QuizSettings {
  mode: QuizMode;
  timerType?: TimerType;
  timerDuration?: number;
  questionTypes?: QuestionType[];
  difficulty?: Difficulty | '';
  chapter?: string;
  questionCount?: number;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
}

export interface QuizSession {
  id: number;
  category_id: number;
  settings: QuizSettings;
  questions: Question[];
  answers: Record<number, string>;
  score?: number;
  total_questions: number;
  completed: boolean;
  started_at: string;
  completed_at?: string;
}

export interface FlashcardProgress {
  id?: number;
  flashcard_id: number;
  category_id: number;
  confidence_level: number;
  times_reviewed: number;
  last_reviewed?: string;
  next_review?: string;
  easiness_factor?: number;
  repetition_count?: number;
  interval_days?: number;
}

export interface NotebookEntry {
  id: number;
  category_id: number;
  question_id: number;
  quiz_session_id?: number;
  user_answer: string;
  correct_answer: string;
  notes?: string;
  reviewed: boolean;
  created_at: string;
  question?: Question;
}

export interface SampleQuestion {
  id: number;
  category_id: number;
  question_text: string;
  answer_text?: string;
  question_type?: QuestionType;
  source?: string;
  created_at: string;
}

// Focus/Integrity tracking
export type FocusEventType = 'focus_lost' | 'tab_switch' | 'window_blur' | 'copy_attempt' | 'paste_attempt';

export interface FocusEvent {
  id: number;
  session_id: number;
  event_type: FocusEventType;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface IntegrityReport {
  session_id: number;
  total_violations: number;
  violation_breakdown: Record<FocusEventType, number>;
  integrity_score: number;
  events: FocusEvent[];
}

// Handwritten answers
export interface HandwrittenAnswer {
  id: number;
  session_id: number;
  question_id: number;
  file_path: string;
  original_name: string;
  recognized_text?: string;
  confidence_score?: number;
  user_corrections?: Record<string, string>;
  created_at: string;
}

// Partial credit grading
export interface PartialCreditGrade {
  id: number;
  session_id: number;
  question_id: number;
  total_points: number;
  earned_points: number;
  breakdown: Record<string, { points: number; feedback: string }>;
  feedback: string;
}

// Stats types
export interface QuestionStats {
  total: number;
  by_difficulty: Record<Difficulty, number>;
  by_type: Record<QuestionType, number>;
  average_rating?: number;
}

export interface FlashcardStats {
  total: number;
  by_difficulty: Record<Difficulty, number>;
  reviewed_count: number;
  average_confidence: number;
  due_for_review: number;
}

export interface NotebookStats {
  total: number;
  reviewed_count: number;
  pending_count: number;
  most_missed_questions: { question_id: number; count: number }[];
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// Analysis types
export interface AnalysisResult {
  id: number;
  category_id: number;
  analysis_type: string;
  patterns: Record<string, unknown>;
  insights: string[];
  created_at: string;
}

export interface AgentActivity {
  id: number;
  category_id: number;
  agent_name: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  details?: Record<string, unknown>;
  created_at: string;
}

// Generation options
export interface GenerateOptions {
  contentType?: QuestionType | 'flashcard';
  count?: number;
  difficulty?: Difficulty | '';
  chapter?: string;
  customDirections?: string;
  documentId?: number;
  useAnalysis?: boolean;
}
