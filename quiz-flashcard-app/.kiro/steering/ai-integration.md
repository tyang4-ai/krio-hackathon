---
inclusion: fileMatch
fileMatchPattern: "**/agents/**/*"
---

# AI Integration Guidelines

## Multi-Agent Architecture

This project uses a **specialized multi-agent system** for AI operations:

### Agent Roles
1. **Controller Agent** (`controller_agent.py`): Orchestrates workflow between agents
2. **Analysis Agent** (`analysis_agent.py`): Analyzes sample questions for patterns
3. **Generation Agent** (`generation_agent.py`): Generates questions/flashcards
4. **Handwriting Agent** (`handwriting_agent.py`): Recognizes handwritten text from PDFs
5. **Grading Agent** (`grading_agent.py`): Provides partial credit grading
6. **Explanation Agent** (`explanation_agent.py`): Generates detailed explanations
7. **Chapter Agent** (`chapter_agent.py`): Organizes content into chapters

### Agent Communication
- Agents communicate through **database tables** (`ai_analysis_results`, `agent_messages`)
- Use **async message passing** for coordination
- Store **analysis results** for reuse (avoid redundant AI calls)
- Log **all agent activity** for debugging

## AI Provider Configuration

### Supported Providers
- **Moonshot/Kimi** (Primary - recommended for reasoning)
- **OpenAI GPT-4o** (Vision/handwriting recognition)
- **NVIDIA NIM** (Legacy support)
- **Groq** (Fast inference, production recommended)
- **Together.ai**, **Ollama**, **AWS Bedrock**, **HuggingFace**

### Provider Selection
```python
# In ai_service.py
client = OpenAI(
    api_key=settings.moonshot_api_key,
    base_url=settings.moonshot_base_url
)

# Vision provider (separate)
vision_client = OpenAI(
    api_key=settings.openai_api_key
)
```

### Environment Variables
```bash
AI_PROVIDER=moonshot
AI_MODEL=kimi-k2-0711-preview
MOONSHOT_API_KEY=your_key
VISION_PROVIDER=openai
VISION_MODEL=gpt-4o
OPENAI_API_KEY=your_key
```

## Prompt Engineering Best Practices

### Question Generation Prompts
- Include **clear instructions** for question type
- Specify **difficulty level** explicitly
- Provide **sample questions** when available (style guide)
- Include **user preferences** (ratings, performance data)
- Request **JSON format** for structured output
- Add **custom directions** from user input

### Prompt Structure
```python
prompt = f"""
Based on the following content, generate {count} quiz questions.

Requirements:
- Difficulty level: {difficulty}
- Question type: {question_type}
- Each question should test different concepts
- Provide clear, unambiguous questions

{style_guide_section}  # From analysis agent
{custom_directions_section}  # User input
{personalization_section}  # User ratings/performance

Content:
{content}

Return JSON format:
{{
  "questions": [{{
    "question_text": "...",
    "question_type": "multiple_choice",
    "difficulty": "medium",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correct_answer": "A",
    "explanation": "...",
    "tags": ["topic1", "topic2"]
  }}]
}}
"""
```

### Personalization Integration
- Use **highly-rated questions** (4-5 stars) as style examples
- Avoid **poorly-rated patterns** (1-2 stars)
- Focus on **weak topics** (low accuracy areas)
- Adjust **difficulty** based on overall performance
- Include **performance stats** in prompt context

## Error Handling

### AI API Errors
```python
try:
    response = await client.chat.completions.create(...)
except OpenAIError as e:
    logger.error("ai_api_error", error=str(e), provider=settings.ai_provider)
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="AI service temporarily unavailable"
    )
```

### Retry Logic
- Implement **exponential backoff** for transient errors
- Set **max retries** (3-5 attempts)
- Log **retry attempts** for monitoring
- Fail gracefully with **user-friendly messages**

### Rate Limiting
- Respect **provider rate limits**
- Implement **request queuing** if needed
- Cache **analysis results** to reduce API calls
- Use **batch processing** where possible

## Response Parsing

### JSON Extraction
```python
import json
import re

def extract_json_from_response(text: str) -> dict:
    """Extract JSON from AI response, handling markdown code blocks."""
    # Remove markdown code blocks
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError as e:
        logger.error("json_parse_error", text=text[:200], error=str(e))
        raise ValueError("Failed to parse AI response")
```

### Validation
- Validate **all AI responses** against Pydantic schemas
- Check for **required fields** (question_text, correct_answer, etc.)
- Verify **data types** match expectations
- Handle **malformed responses** gracefully

## Performance Optimization

### Caching Strategy
- Cache **analysis results** in `ai_analysis_results` table
- Reuse **style guides** until sample questions change
- Store **AI insights** in `user_preferences` table
- Avoid **redundant API calls** for same content

### Batch Operations
- Generate **multiple questions** in single API call
- Process **multiple documents** together when possible
- Use **async operations** for parallel processing

### Token Management
- Monitor **token usage** for cost control
- Truncate **long documents** if needed
- Use **smaller models** for simple tasks
- Reserve **larger models** for complex reasoning

## Testing AI Features

### Mock AI Responses
```python
# In tests
@pytest.fixture
def mock_ai_response():
    return {
        "questions": [{
            "question_text": "Test question?",
            "question_type": "multiple_choice",
            "difficulty": "medium",
            "options": ["A) Option 1", "B) Option 2"],
            "correct_answer": "A",
            "explanation": "Test explanation",
            "tags": ["test"]
        }]
    }
```

### Integration Testing
- Test with **real AI providers** in staging
- Verify **response formats** match expectations
- Test **error handling** with invalid inputs
- Monitor **response times** and latency

## Monitoring & Debugging

### Logging
```python
logger.info(
    "ai_generation_complete",
    provider=settings.ai_provider,
    model=settings.ai_model,
    question_count=len(questions),
    duration_ms=duration,
    tokens_used=response.usage.total_tokens
)
```

### Metrics to Track
- **API call success rate**
- **Average response time**
- **Token usage per request**
- **Error rates by provider**
- **User satisfaction** (ratings)

### Debugging Tips
- Log **full prompts** in development mode
- Save **raw AI responses** for analysis
- Track **agent message flow** in database
- Use **Sentry** for production error tracking
