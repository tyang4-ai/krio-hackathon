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
  color?: string;
  icon?: string;
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

export type QuestionType = 'multiple_choice' | 'true_false' | 'written' | 'written_answer' | 'fill_in_blank';
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

// Analytics types
export interface AnalyticsOverview {
  total_attempts: number;
  correct_count: number;
  accuracy: number;
  total_time_minutes: number;
  avg_time_per_question: number;
  sessions_completed: number;
  streak_days: number;
  period_days: number;
}

export interface CategoryPerformance {
  category_id: number;
  category_name: string;
  color: string;
  total_attempts: number;
  correct_count: number;
  accuracy: number;
  avg_time: number;
  mastery_score: number; // 0-5
}

export interface DifficultyBreakdown {
  total: number;
  correct: number;
  accuracy: number;
}

export interface QuestionTypeBreakdown {
  total: number;
  correct: number;
  accuracy: number;
  avg_time: number;
}

export interface TrendDataPoint {
  date: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface HardestQuestion {
  question_id: number;
  category_id: number;
  question_text: string;
  question_type: string;
  difficulty: string;
  attempts: number;
  correct: number;
  accuracy: number;
}

export interface LearningScore {
  total_score: number;
  accuracy_score: number;
  consistency_score: number;
  improvement_score: number;
  difficulty_score: number;
  grade: string;
  recommendation: string;
}

export interface AnalyticsDashboard {
  overview: AnalyticsOverview;
  category_performance: CategoryPerformance[];
  difficulty_breakdown: Record<string, DifficultyBreakdown>;
  question_type_breakdown: Record<string, QuestionTypeBreakdown>;
  trend_data: TrendDataPoint[];
  hardest_questions: HardestQuestion[];
  learning_score: LearningScore;
}

// Achievements (Kiroween Hackathon - Education + Web3)
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type VerificationStatus = 'pending' | 'uploaded' | 'verified' | 'failed';
export type AchievementCategory = 'accuracy' | 'streak' | 'volume' | 'mastery';

export interface Achievement {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: AchievementCategory;
  icon_name: string;
  icon_color: string;
  rarity: AchievementRarity;
  points: number;
  trigger_type: string;
  is_active: boolean;
  sort_order: number;
}

export interface AchievementWithProgress {
  achievement: Achievement;
  is_unlocked: boolean;
  earned_at?: string;
  progress?: number;  // 0-100 for locked
  progress_text?: string;  // e.g., "50/100 questions"
  verification_status?: VerificationStatus;
  ipfs_url?: string;
  tx_hash?: string;
}

export interface UserAchievementsResponse {
  achievements: AchievementWithProgress[];
  total_points: number;
  unlocked_count: number;
  total_count: number;
}

export interface AchievementDetail {
  id: number;
  achievement: Achievement;
  earned_at: string;
  context_data?: Record<string, unknown>;
  ipfs_hash?: string;
  ipfs_url?: string;
  tx_hash?: string;
  block_number?: number;
  chain_id: number;
  verification_status: VerificationStatus;
  certificate_data?: {
    version: string;
    type: string;
    achievement_slug: string;
    achievement_name: string;
    achievement_rarity: string;
    recipient_user_id: number;
    recipient_display?: string;
    earned_timestamp: string;
    context?: Record<string, unknown>;
    chain_name: string;
    chain_id: number;
    signature?: string;
  };
  basescan_url?: string;
}
