"""SQLAlchemy ORM models for Scholarly."""
from config.database import Base

# Core models
from .category import Category
from .document import Document
from .question import Question
from .flashcard import Flashcard
from .quiz_session import QuizSession
from .notebook_entry import NotebookEntry
from .flashcard_progress import FlashcardProgress

# Sample questions and AI
from .sample_question import SampleQuestion
from .ai_analysis import AIAnalysisResult, AgentMessage

# User data
from .user import User
from .user_preferences import UserPreference, QuestionPerformance

# Handwriting and grading
from .handwriting import HandwrittenAnswer, HandwritingCorrection
from .grading import PartialCreditGrade, ExamFocusEvent

# Analytics
from .question_attempt import QuestionAttempt

# Achievements (blockchain-verified)
from .achievement import Achievement, UserAchievement

__all__ = [
    "Base",
    # Core
    "Category",
    "Document",
    "Question",
    "Flashcard",
    "QuizSession",
    "NotebookEntry",
    "FlashcardProgress",
    # Sample questions and AI
    "SampleQuestion",
    "AIAnalysisResult",
    "AgentMessage",
    # User data
    "User",
    "UserPreference",
    "QuestionPerformance",
    # Handwriting and grading
    "HandwrittenAnswer",
    "HandwritingCorrection",
    "PartialCreditGrade",
    "ExamFocusEvent",
    # Analytics
    "QuestionAttempt",
    # Achievements
    "Achievement",
    "UserAchievement",
]
