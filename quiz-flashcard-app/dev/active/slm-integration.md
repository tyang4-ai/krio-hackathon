# SLM Integration - Development Context

**Last Updated:** 2025-12-04

## Overview

Phase 4 of the RAG pipeline adds Small Language Model (SLM) integration for cost optimization. Simple tasks are routed to cheaper, faster models while quality-critical tasks remain on Claude.

## Model Configuration

| Provider | Model | Use Case | Speed | Cost |
|----------|-------|----------|-------|------|
| **Anthropic** | `claude-sonnet-4-20250514` | Questions, grading, organization | ~150 tok/s | ~$3/$15 per 1M |
| **Groq** | `llama-3.1-8b-instant` | Simple flashcards | ~800 tok/s | ~$0.05/$0.08 per 1M |
| **Groq** | `llama-3.3-70b-versatile` | Short explanations | ~250 tok/s | ~$0.59/$0.79 per 1M |
| **OpenAI** | `gpt-4o` | Handwriting OCR (vision) | N/A | ~$5/$15 per 1M |

## Task Routing Strategy

### Quality-Critical Tasks (Always Claude)
- Question generation (all types)
- Document organization / chapter detection
- Quality scoring and validation
- Written answer grading
- Complex explanations (long queries or conversation history)

### SLM-Eligible Tasks
- Simple vocabulary flashcards (`difficulty="concepts"`)
- Short explanations (`query < 100 chars` AND `history <= 2 messages`)

### Hardcoded (No AI)
- MCQ/True-False grading (uses `_check_simple_answer()`)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Request                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    TaskRouter                                │
│  - get_model_tier(task_type) → SLM_SMALL/SLM_LARGE/LLM     │
│  - should_use_slm(task_type) → bool                         │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ SLM 8B   │   │ SLM 70B  │   │ Claude   │
        │ (Groq)   │   │ (Groq)   │   │ Sonnet 4 │
        └──────────┘   └──────────┘   └──────────┘
              │               │               │
              └───────────────┴───────────────┘
                              │
                              ▼
                     ┌──────────────┐
                     │   Response   │
                     │ + used_slm   │
                     └──────────────┘
```

## Key Files

### New Files
| File | Purpose |
|------|---------|
| [services/task_router.py](../../backend-python-slm-copy/services/task_router.py) | Task routing logic with ModelTier enum |

### Modified Files
| File | Changes |
|------|---------|
| [config/settings.py](../../backend-python-slm-copy/config/settings.py) | SLM provider settings (Groq, Cerebras) |
| [services/ai_service.py](../../backend-python-slm-copy/services/ai_service.py) | Groq client + `generate_with_slm()` method |
| [agents/generation_agent.py](../../backend-python-slm-copy/agents/generation_agent.py) | SLM routing for flashcards |
| [agents/explanation_agent.py](../../backend-python-slm-copy/agents/explanation_agent.py) | SLM routing for short explanations |

## Configuration

### Environment Variables
```bash
# Required for SLM
GROQ_API_KEY=gsk_...

# Optional - Feature flag (default: true)
SLM_ENABLED=true

# Optional - Fallback provider
CEREBRAS_API_KEY=...
```

### Settings (settings.py)
```python
# SLM Provider Settings
slm_provider: str = "groq"           # Options: groq, cerebras
slm_enabled: bool = True             # Feature flag

# Groq Settings
groq_base_url: str = "https://api.groq.com/openai/v1"
groq_model_small: str = "llama-3.1-8b-instant"
groq_model_large: str = "llama-3.3-70b-versatile"
```

## API Usage

### AIService - generate_with_slm()
```python
from services.ai_service import ai_service

response = await ai_service.generate_with_slm(
    prompt="Generate a flashcard for 'Photosynthesis'",
    system_prompt="You are a flashcard generator.",
    max_tokens=200,
    temperature=0.3,
    use_large_model=False,  # False = 8B, True = 70B
    json_mode=False,
)
```

### TaskRouter
```python
from services.task_router import task_router, TaskType, ModelTier

# Check which model tier to use
tier = task_router.get_model_tier(TaskType.FLASHCARD_VOCABULARY)
# Returns: ModelTier.SLM_SMALL

# Check if SLM should be used
should_use = task_router.should_use_slm(TaskType.SHORT_EXPLANATION)
# Returns: True (if SLM enabled and task is SLM-eligible)
```

## Response Format

Both generation_agent and explanation_agent now include `used_slm` in response:

```json
{
  "success": true,
  "explanation": "The mitochondria is called the powerhouse...",
  "used_slm": true
}
```

## Fallback Behavior

If Groq API fails or is unavailable:
1. `generate_with_slm()` catches the exception
2. Logs warning: `slm_fallback_to_claude`
3. Automatically calls `generate_text()` (Claude)
4. Response still returned successfully

## Cost Comparison

| Task | Before (Haiku) | After (SLM) | Savings |
|------|----------------|-------------|---------|
| 1000 flashcards | ~$0.25 | ~$0.05 | 80% |
| 1000 short explanations | ~$1.25 | ~$0.59 | 53% |
| 1000 questions | ~$3.00 | ~$3.00 | 0% (quality-critical) |

## Testing

### Manual Test Commands
```bash
cd quiz-flashcard-app/backend-python-slm-copy

# Set API key
set GROQ_API_KEY=gsk_...

# Test imports
python -c "from services.task_router import task_router; print('OK')"

# Test Groq API
python -c "
import asyncio
from openai import AsyncOpenAI
async def test():
    client = AsyncOpenAI(api_key='gsk_...', base_url='https://api.groq.com/openai/v1')
    r = await client.chat.completions.create(model='llama-3.1-8b-instant', messages=[{'role':'user','content':'Hi'}], max_tokens=10)
    print(r.choices[0].message.content)
asyncio.run(test())
"
```

## Branch Information

- **Development Branch**: `feature/slm-integration`
- **Isolation Folder**: `backend-python-slm-copy/` (separate from main backend)
- **Main Backend**: `backend-python/` (unchanged until merge)

## Migration to Production

When ready to deploy SLM to production:
1. Copy changes from `backend-python-slm-copy/` to `backend-python/`
2. Set `GROQ_API_KEY` environment variable in production
3. Deploy backend
4. Monitor logs for `slm_generate_text` and `slm_fallback_to_claude`
