import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Loader2, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { aiApi } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface QuestionContext {
  questionText: string;
  questionType: string;
  options: string[];
  correctAnswer: string;
  userAnswer?: string;
  explanation?: string;
}

interface ExplanationChatProps {
  question: QuestionContext;
  isCorrect: boolean;
  onClose?: () => void;
}

const QUICK_PROMPTS = [
  "Why is this the correct answer?",
  "Explain this concept in simpler terms",
  "What are common mistakes for this topic?",
  "Can you give me an example?",
];

// Simple markdown renderer for chat messages
function renderMarkdown(text: string): React.ReactNode {
  // Split by code blocks first
  const parts = text.split(/(`[^`]+`)/g);

  return parts.map((part, index) => {
    // Handle inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Handle bold and italic in regular text
    const elements: React.ReactNode[] = [];
    let remaining = part;
    let keyCounter = 0;

    while (remaining.length > 0) {
      // Check for bold (**text**)
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
      // Check for italic (*text*)
      const italicMatch = remaining.match(/\*([^*]+)\*/);

      if (boldMatch && boldMatch.index !== undefined) {
        // Add text before the match
        if (boldMatch.index > 0) {
          elements.push(remaining.slice(0, boldMatch.index));
        }
        // Add bold text
        elements.push(
          <strong key={`${index}-${keyCounter++}`} className="font-semibold">
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      } else if (italicMatch && italicMatch.index !== undefined) {
        // Add text before the match
        if (italicMatch.index > 0) {
          elements.push(remaining.slice(0, italicMatch.index));
        }
        // Add italic text
        elements.push(
          <em key={`${index}-${keyCounter++}`} className="italic">
            {italicMatch[1]}
          </em>
        );
        remaining = remaining.slice(italicMatch.index + italicMatch[0].length);
      } else {
        // No more matches, add remaining text
        elements.push(remaining);
        break;
      }
    }

    return <span key={index}>{elements}</span>;
  });
}

function ExplanationChat({ question, isCorrect, onClose }: ExplanationChatProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    // Add initial greeting if no messages
    if (messages.length === 0) {
      const greeting = isCorrect
        ? "Great job on this question! Would you like me to explain the concept further or discuss related topics?"
        : "I see you got this one wrong. Would you like me to explain why the correct answer is right and where you might have gone wrong?";
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;

    setError(null);
    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await aiApi.explainQuestion({
        question_text: question.questionText,
        correct_answer: question.correctAnswer,
        user_query: text,
        question_type: question.questionType,
        options: question.options,
        user_answer: question.userAnswer,
        explanation: question.explanation,
        conversation_history: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      const data = (response.data as any).data || response.data;

      if (data.success && data.explanation) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.explanation }]);
      } else {
        throw new Error(data.error || 'Failed to get explanation');
      }
    } catch (err: any) {
      console.error('Explanation error:', err);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to get explanation';
      setError(errorMsg);
      // Remove the user message if failed
      setMessages(prev => prev.slice(0, -1));
      setInputValue(text); // Restore the input
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Closed state - just show the button
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
        title="Ask AI for explanation"
      >
        <HelpCircle className="h-4 w-4" />
        <span>Ask AI</span>
      </button>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          <span>AI Tutor</span>
          <ChevronUp className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // Full chat interface
  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white rounded-t-xl">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">AI Tutor</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-indigo-500 rounded transition-colors"
            title="Minimize"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-indigo-500 rounded transition-colors"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Question Context */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-sm">
        <p className="text-gray-600 dark:text-gray-400 truncate" title={question.questionText}>
          <span className="font-medium">Q:</span> {question.questionText.substring(0, 80)}
          {question.questionText.length > 80 ? '...' : ''}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[350px]">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{renderMarkdown(message.content)}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-md">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Quick prompts */}
      {messages.length <= 2 && !isLoading && (
        <div className="px-4 pb-2">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSendMessage(prompt)}
                className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isLoading}
            className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExplanationChat;
