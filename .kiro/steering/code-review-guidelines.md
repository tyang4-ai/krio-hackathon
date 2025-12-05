---
inclusion: manual
---

# Code Review Guidelines

Use this guide when reviewing code for quality, best practices, and architectural consistency.

## Review Focus Areas

### 1. Implementation Quality
- **Type Safety**: Verify TypeScript strict mode compliance and proper type annotations
- **Error Handling**: Check for comprehensive try/catch blocks and proper error propagation
- **Edge Cases**: Ensure boundary conditions and error paths are handled
- **Naming**: Validate consistent naming conventions (camelCase, PascalCase, snake_case)
- **Async/Await**: Confirm proper promise handling and no unhandled rejections

### 2. Design Decisions
- **Pattern Consistency**: Verify alignment with established project patterns
- **Separation of Concerns**: Check proper layering (routes → services → database)
- **Code Duplication**: Identify opportunities for abstraction
- **Technical Debt**: Flag potential maintenance issues

### 3. System Integration
- **API Contracts**: Ensure endpoints match frontend expectations
- **Database Operations**: Verify proper use of async SQLAlchemy patterns
- **Authentication**: Confirm JWT and auth middleware usage
- **AI Integration**: Check proper agent coordination and error handling

### 4. Technology-Specific Checks

#### Backend (FastAPI/Python)
- Proper use of async/await with AsyncSession
- Pydantic models for validation
- Structured logging with structlog
- Sentry error tracking
- Rate limiting on appropriate endpoints

#### Frontend (React/TypeScript)
- Functional components with hooks
- Proper state management (useState, useContext)
- API calls through api.ts service
- Tailwind CSS for styling
- Dark mode support

### 5. Security Review
- No hardcoded secrets or API keys
- Input validation on all endpoints
- SQL injection prevention (use ORM)
- XSS prevention (React handles automatically)
- File upload validation
- Rate limiting on sensitive endpoints

## Review Process

### Step 1: Understand Context
- What problem does this code solve?
- What are the requirements?
- How does it fit into the larger system?

### Step 2: Analyze Implementation
- Read through the code systematically
- Check against project patterns in steering rules
- Verify error handling and edge cases
- Look for potential bugs or issues

### Step 3: Assess Quality
- Is the code readable and maintainable?
- Are there appropriate comments for complex logic?
- Is the code testable?
- Does it follow DRY principles?

### Step 4: Provide Feedback
Structure feedback by severity:

**Critical Issues** (must fix):
- Security vulnerabilities
- Data loss risks
- Breaking changes
- Performance bottlenecks

**Important Improvements** (should fix):
- Pattern violations
- Missing error handling
- Type safety issues
- Code duplication

**Minor Suggestions** (nice to have):
- Naming improvements
- Comment additions
- Refactoring opportunities

## Common Issues to Watch For

### Backend
- ❌ Business logic in routers (should be in services)
- ❌ Direct database access without service layer
- ❌ Missing error handling in async functions
- ❌ No input validation with Pydantic
- ❌ Untracked errors (not sent to Sentry)
- ❌ Synchronous code in async functions

### Frontend
- ❌ API calls not using api.ts service
- ❌ Direct fetch/axios instead of centralized client
- ❌ Missing loading states
- ❌ No error handling for API calls
- ❌ Prop drilling instead of context
- ❌ Missing dark mode variants

### Database
- ❌ Missing indexes on frequently queried columns
- ❌ N+1 query problems
- ❌ Missing foreign key constraints
- ❌ No migration for schema changes
- ❌ Raw SQL instead of ORM

## Review Checklist

- [ ] Code follows project conventions
- [ ] Proper error handling throughout
- [ ] Input validation on all endpoints
- [ ] Type safety maintained
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Tests included (if applicable)
- [ ] Documentation updated
- [ ] No breaking changes (or properly documented)
- [ ] Logging added for important operations

## Constructive Feedback Guidelines

1. **Explain the "why"**: Don't just say what's wrong, explain why it matters
2. **Reference patterns**: Point to existing code or documentation
3. **Suggest alternatives**: Provide concrete examples of better approaches
4. **Prioritize**: Focus on issues that truly impact quality
5. **Be specific**: Use file names, line numbers, and code examples
6. **Stay positive**: Frame feedback as opportunities for improvement

## Example Review Comments

### Good Feedback
```
❌ Critical: Missing error handling in quiz submission (QuizSession.tsx:145)
The submitQuiz function doesn't handle network errors, which could leave 
users stuck. Wrap in try/catch and show error toast.

Example:
try {
  await api.post('/quiz/submit', answers);
} catch (error) {
  showToast('Failed to submit quiz. Please try again.');
}
```

### Poor Feedback
```
❌ This code is bad and needs to be fixed.
```

## Post-Review Actions

After completing a review:
1. Summarize critical findings
2. List recommended changes by priority
3. Identify any blockers
4. Suggest next steps
5. **Wait for approval** before implementing changes
