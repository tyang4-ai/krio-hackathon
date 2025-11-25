"""
Base Agent class for the multi-agent AI system.

Agent Types:
- Controller: Orchestrates other agents
- Analysis: Analyzes documents for patterns and topics
- Generation: Creates questions and flashcards
- Handwriting: OCR for handwritten answers (uses OpenAI Vision)
- Grading: Grades written answers with partial credit
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

import structlog

from services import ai_service

logger = structlog.get_logger()


class AgentRole(str, Enum):
    """Roles for different agents in the system."""

    CONTROLLER = "controller"
    ANALYSIS = "analysis"
    GENERATION = "generation"
    HANDWRITING = "handwriting"
    GRADING = "grading"


@dataclass
class AgentMessage:
    """Message passed between agents."""

    role: AgentRole
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage/logging."""
        return {
            "role": self.role.value,
            "content": self.content,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat(),
        }


class BaseAgent(ABC):
    """
    Abstract base class for all AI agents.

    Each agent has:
    - A role (controller, analysis, generation, handwriting, grading)
    - A system prompt defining its behavior
    - Methods to process inputs and generate outputs
    """

    def __init__(self, role: AgentRole, system_prompt: str):
        """
        Initialize the agent.

        Args:
            role: The agent's role in the system
            system_prompt: Instructions for the AI model
        """
        self.role = role
        self.system_prompt = system_prompt
        self._message_history: List[AgentMessage] = []

        logger.info("agent_initialized", role=role.value)

    @abstractmethod
    async def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process input and generate output.

        Args:
            input_data: Input data for the agent

        Returns:
            Processed output data
        """
        pass

    async def generate(
        self,
        prompt: str,
        max_tokens: int = 2048,
        temperature: float = 0.7,
    ) -> str:
        """
        Generate a response using the AI service.

        Args:
            prompt: The prompt to send
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature

        Returns:
            Generated response text
        """
        logger.info(
            "agent_generate",
            role=self.role.value,
            prompt_length=len(prompt),
        )

        response = await ai_service.generate_text(
            prompt=prompt,
            system_prompt=self.system_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        # Store message in history
        self._message_history.append(
            AgentMessage(
                role=self.role,
                content=response,
                metadata={"prompt_length": len(prompt)},
            )
        )

        return response

    async def generate_json(
        self,
        prompt: str,
        max_tokens: int = 4096,
    ) -> str:
        """
        Generate a JSON response.

        Args:
            prompt: The prompt to send
            max_tokens: Maximum tokens to generate

        Returns:
            JSON string response
        """
        return await ai_service.generate_json(
            prompt=prompt,
            system_prompt=self.system_prompt,
            max_tokens=max_tokens,
        )

    def add_message(self, message: AgentMessage) -> None:
        """Add a message to the history."""
        self._message_history.append(message)

    def get_history(self) -> List[AgentMessage]:
        """Get message history."""
        return self._message_history.copy()

    def clear_history(self) -> None:
        """Clear message history."""
        self._message_history.clear()

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(role={self.role.value})"
