---
inclusion: manual
---

# Refactoring Guide

Use this guide when planning or executing code refactoring tasks.

## When to Refactor

### Good Reasons
- Code duplication across multiple files
- Complex functions that are hard to understand
- Violation of SOLID principles
- Performance bottlenecks
- Outdated patterns or deprecated APIs
- Poor testability
- Difficult to maintain or extend

### Bad Reasons
- "Just because" or personal preference
- Working code with no issues
- Right before a deadline
- Without understanding the current implementation

## Refactoring Process

### Phase 1: Analysis
1. **Understand Current State**
   - Read and comprehend existing code
   - Identify all dependencies
   - Map out data flow
   - Document current behavior

2. **Identify Issues**
   - Code smells (long methods, large classes, etc.)
   - Duplication patterns
   - Coupling problems
   - Performance issues
   - Testing gaps

3. **Define Goals**
   - What will improve?
   - What are success criteria?
   - What risks exist?
   - What's the effort estimate?

### Phase 2: Planning
1. **Break Down Changes**
   - Create incremental steps
   - Ensure each step maintains functionality
   - Identify dependencies between steps
   - Plan for rollback at each step

2. **Risk Assessment**
   - What could break?
   - What's the blast radius?
   - How will we test?
   - What's the rollback plan?

3. **Create Checklist**
   - List all files to modify
   - Define acceptance criteria
   - Plan testing strategy
   - Document migration path

### Phase 3: Execution
1. **Start Small**
   - Make one change at a time
   - Test after each change
   - Commit frequently
   - Keep changes focused

2. **Maintain Functionality**
   - Don't change behavior and structure simultaneously
   - Use feature flags if needed
   - Keep old code until new code is proven
   - Run tests continuously

3. **Document Changes**
   - Update comments and documentation
   - Note any breaking changes
   - Update API documentation
   - Add migration notes

## Common Refactoring Patterns

### Extract Function
**Before:**
```python
async def process_quiz(db, quiz_id):
    # 50 lines of complex logic
    quiz = await db.execute(select(Quiz).where(Quiz.id == quiz_id))
    # More complex logic
    # Calculate scores
    # Update database
    # Send notifications
```

**After:**
```python
async def process_quiz(db, quiz_id):
    quiz = await get_quiz(db, quiz_id)
    score = await calculate_score(quiz)
    await update_quiz_results(db, quiz_id, score)
    await send_completion_notification(quiz)
```

### Extract Service
**Before:**
```python
# In router
@router.post("/generate")
async def generate_questions(data: dict, db: AsyncSession = Depends(get_db)):
    # 100 lines of AI logic, database operations, etc.
```

**After:**
```python
# In router
@router.post("/generate")
async def generate_questions(data: dict, db: AsyncSession = Depends(get_db)):
    questions = await question_service.generate_questions(db, data)
    return questions

# In service
class QuestionService:
    async def generate_questions(self, db: AsyncSession, data: dict):
        # Business logic here
```

### Replace Conditional with Polymorphism
**Before:**
```typescript
function gradeQuestion(question: Question, answer: string) {
  if (question.type === 'multiple_choice') {
    return answer === question.correct_answer;
  } else if (question.type === 'true_false') {
    return answer.toLowerCase() === question.correct_answer.toLowerCase();
  } else if (question.type === 'written_answer') {
    return checkSemanticMatch(answer, question.correct_answer);
  }
}
```

**After:**
```typescript
interface QuestionGrader {
  grade(answer: string, correctAnswer: string): boolean;
}

class MultipleChoiceGrader implements QuestionGrader {
  grade(answer: string, correctAnswer: string): boolean {
    return answer === correctAnswer;
  }
}

class TrueFalseGrader implements QuestionGrader {
  grade(answer: string, correctAnswer: string): boolean {
    return answer.toLowerCase() === correctAnswer.toLowerCase();
  }
}

const graders: Record<QuestionType, QuestionGrader> = {
  multiple_choice: new MultipleChoiceGrader(),
  true_false: new TrueFalseGrader(),
  written_answer: new WrittenAnswerGrader(),
};

function gradeQuestion(question: Question, answer: string) {
  return graders[question.type].grade(answer, question.correct_answer);
}
```

## Refactoring Checklist

### Before Starting
- [ ] Understand current implementation completely
- [ ] Have comprehensive tests (or write them first)
- [ ] Document current behavior
- [ ] Get approval for refactoring plan
- [ ] Ensure no urgent deadlines

### During Refactoring
- [ ] Make small, incremental changes
- [ ] Run tests after each change
- [ ] Commit frequently with clear messages
- [ ] Keep functionality unchanged
- [ ] Update documentation as you go

### After Refactoring
- [ ] All tests pass
- [ ] No regressions in functionality
- [ ] Performance is same or better
- [ ] Code is more maintainable
- [ ] Documentation is updated
- [ ] Team is informed of changes

## Red Flags to Avoid

❌ **Big Bang Refactoring**: Changing everything at once
❌ **Scope Creep**: Adding features during refactoring
❌ **No Tests**: Refactoring without test coverage
❌ **Breaking Changes**: Changing public APIs without migration path
❌ **Premature Optimization**: Optimizing before measuring
❌ **Over-Engineering**: Adding unnecessary complexity

## Project-Specific Patterns

### Backend Refactoring
- Move business logic from routers to services
- Extract database operations to repositories
- Use Pydantic models for validation
- Add proper error handling with Sentry
- Implement caching where appropriate

### Frontend Refactoring
- Extract reusable components
- Move API calls to services
- Use custom hooks for shared logic
- Implement proper loading/error states
- Add TypeScript types

### Database Refactoring
- Create migrations for schema changes
- Add indexes for performance
- Normalize data where appropriate
- Use proper foreign key constraints
- Optimize queries with eager loading

## Success Metrics

A successful refactoring should result in:
- ✅ Improved code readability
- ✅ Better test coverage
- ✅ Reduced code duplication
- ✅ Easier to extend and maintain
- ✅ Same or better performance
- ✅ No functionality regressions
- ✅ Clearer separation of concerns
