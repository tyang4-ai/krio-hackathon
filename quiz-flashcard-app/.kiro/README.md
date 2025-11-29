# Kiro Configuration for StudyForge

This directory contains Kiro-specific configuration files to enhance your development experience with AI assistance.

## Structure

### Steering Rules (`steering/`)
Contextual guidelines that help Kiro understand the project:

**Always Active:**
- **project-overview.md**: High-level project architecture and tech stack
- **coding-standards.md**: Python and TypeScript coding conventions
- **security-guidelines.md**: Security best practices and checklists

**File-Matched (Auto-activate):**
- **database-patterns.md**: SQLAlchemy async patterns (models, services)
- **frontend-patterns.md**: React, TypeScript, Tailwind (frontend files)
- **ai-integration.md**: Multi-agent AI system (agents folder)
- **api-documentation.md**: FastAPI endpoints (routers)
- **docker-development.md**: Docker workflow (docker-compose, Dockerfile)
- **testing-guidelines.md**: Testing patterns (test files)

**Manual (Use when needed):**
- **refactoring-guide.md**: Comprehensive refactoring methodology
- **code-review-guidelines.md**: Code review best practices
- **troubleshooting-guide.md**: Common issues and solutions

### Hooks (`hooks/`)
Automated actions for common tasks:

**Development:**
- **test-backend.json**: Run pytest tests in Docker
- **check-types.json**: TypeScript type checking
- **format-code.json**: Format Python and TypeScript code
- **logs-backend.json**: Stream backend logs

**Database:**
- **migration-create.json**: Create Alembic database migrations
- **db-migrate.json**: Apply pending migrations
- **db-reset.json**: Reset database (with warning)

**Code Quality:**
- **review-code.json**: Review code for best practices
- **check-api-contracts.json**: Verify frontend-backend alignment
- **plan-refactor.json**: Create refactoring plan
- **update-docs.json**: Update project documentation

### Settings (`settings/`)
- **mcp.json**: Model Context Protocol configuration (currently empty)

## Usage

### Steering Rules
Steering rules are automatically included based on file context:
- **Always included**: `project-overview.md`, `coding-standards.md`
- **File-matched**: Other rules activate when working with matching files

### Hooks
Access hooks via:
1. **Explorer View**: "Agent Hooks" section
2. **Command Palette**: "Open Kiro Hook UI"

### Quick Commands

```bash
# Run backend tests
docker-compose exec backend pytest -v

# Check TypeScript types
cd frontend && npm run type-check

# Create database migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# View logs
docker-compose logs -f backend
```

## Customization

Feel free to:
- Add new steering rules for specific patterns
- Create custom hooks for your workflow
- Modify existing rules to match your preferences

## Learn More

- [Kiro Documentation](https://docs.kiro.ai)
- [Project DEVDOC](../DEVDOC.md)
- [Project README](../README.md)
