"""AI Agents for Scholarly backend."""
from .base_agent import BaseAgent, AgentMessage, AgentRole

# Agent implementations
from .analysis_agent import (
    AnalysisAgent,
    analysis_agent,
    analyze_samples,
    clear_analysis,
    get_analysis_status,
)
from .generation_agent import (
    GenerationAgent,
    generation_agent,
    generate_flashcards,
    generate_questions,
)
from .grading_agent import (
    GradingAgent,
    grading_agent,
    grade_answer,
    get_session_grades,
)
from .handwriting_agent import (
    HandwritingAgent,
    handwriting_agent,
    get_handwritten_answer,
    get_session_handwritten_answers,
    process_handwritten_answer,
    update_with_correction,
)
from .controller_agent import (
    ControllerAgent,
    controller_agent,
    generate_from_documents,
    get_agent_activity,
    get_system_stats,
    trigger_analysis,
)

__all__ = [
    # Base classes
    "BaseAgent",
    "AgentMessage",
    "AgentRole",
    # Analysis Agent
    "AnalysisAgent",
    "analysis_agent",
    "analyze_samples",
    "clear_analysis",
    "get_analysis_status",
    # Generation Agent
    "GenerationAgent",
    "generation_agent",
    "generate_flashcards",
    "generate_questions",
    # Grading Agent
    "GradingAgent",
    "grading_agent",
    "grade_answer",
    "get_session_grades",
    # Handwriting Agent
    "HandwritingAgent",
    "handwriting_agent",
    "get_handwritten_answer",
    "get_session_handwritten_answers",
    "process_handwritten_answer",
    "update_with_correction",
    # Controller Agent
    "ControllerAgent",
    "controller_agent",
    "generate_from_documents",
    "get_agent_activity",
    "get_system_stats",
    "trigger_analysis",
]
