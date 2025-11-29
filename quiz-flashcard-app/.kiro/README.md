# Kiro Configuration for StudyForge

This directory contains Kiro-specific configuration files to enhance your development experience with AI assistance.

## Structure

### Steering Rules (`steering/`)
Contextual guidelines that help Kiro understand the project:

- **project-overview.md**: High-level project architecture and tech stack
- **coding-standards.md**: Python and TypeScript coding conventions
- **database-patterns.md**: SQLAlchemy async patterns and best practices
- **frontend-patterns.md**: React, TypeScript, and Tailwind CSS patterns
- **ai-integration.md**: Multi-agent AI system guidelines
- **testing-guidelines.md**: Testing patterns for backend and frontend
- **api-documentation.md**: FastAPI endpoint documentation standards

### Hooks (`hooks/`)
Automated actions triggered by events:

- **test-backend.json**: Run pytest tests in Docker
- **check-types.json**: TypeScript type checking
- **format-code.json**: Format Python and TypeScript code
- **migration-create.json**: Create Alembic database migrations
- **logs-backend.json**: Stream backend logs

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
