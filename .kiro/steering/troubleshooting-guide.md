---
inclusion: manual
---

# Troubleshooting Guide

Common issues and solutions for the StudyForge project.

## Docker Issues

### Container Won't Start
**Symptoms**: Container exits immediately or fails to start

**Solutions**:
```bash
# Check logs for errors
docker-compose logs backend
docker-compose logs postgres

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up

# Check if ports are in use
netstat -ano | findstr :8000
netstat -ano | findstr :5432
```

### Database Connection Failed
**Symptoms**: Backend can't connect to PostgreSQL

**Solutions**:
```bash
# Check if postgres is healthy
docker-compose ps

# Restart postgres
docker-compose restart postgres

# Check connection string in .env
# Should be: postgresql+asyncpg://scholarly:localdev123@postgres:5432/scholarly

# Reset database (WARNING: deletes data)
docker-compose down -v
docker-compose up
```

### Hot Reload Not Working
**Symptoms**: Code changes don't reflect in running container

**Solutions**:
```bash
# For Windows, ensure in .env:
WATCHFILES_FORCE_POLLING=true

# Restart the service
docker-compose restart backend

# Check volume mounts in docker-compose.yml
# Should have: ./backend-python:/app
```

## Backend Issues

### Import Errors
**Symptoms**: `ModuleNotFoundError` or import failures

**Solutions**:
```bash
# Rebuild container with new dependencies
docker-compose up --build backend

# Check requirements.txt has the package
# Verify package name and version

# For local development:
pip install -r requirements.txt
```

### Database Migration Errors
**Symptoms**: Alembic migration fails or schema mismatch

**Solutions**:
```bash
# Check current migration status
docker-compose exec backend alembic current

# View migration history
docker-compose exec backend alembic history

# Downgrade one migration
docker-compose exec backend alembic downgrade -1

# Upgrade to latest
docker-compose exec backend alembic upgrade head

# If migrations are broken, reset database
docker-compose down -v
docker-compose up -d postgres
sleep 5
docker-compose exec backend alembic upgrade head
```

### AI API Errors
**Symptoms**: Question generation fails or times out

**Solutions**:
1. **Check API Keys**:
   ```bash
   # Verify .env has correct keys
   MOONSHOT_API_KEY=sk-...
   OPENAI_API_KEY=sk-...
   ```

2. **Check Provider Status**:
   - Moonshot: https://platform.moonshot.cn/
   - OpenAI: https://status.openai.com/

3. **Check Rate Limits**:
   - View backend logs: `docker-compose logs -f backend`
   - Look for 429 (rate limit) errors

4. **Switch Providers**:
   ```bash
   # In .env, change:
   AI_PROVIDER=groq  # or nvidia, openai
   GROQ_API_KEY=your_key
   ```

### Sentry Errors Not Showing
**Symptoms**: Errors not appearing in Sentry dashboard

**Solutions**:
1. Check SENTRY_DSN in .env
2. Verify environment is set correctly
3. Check Sentry project settings
4. Look for initialization errors in logs

## Frontend Issues

### API Calls Failing
**Symptoms**: Network errors or 404s from frontend

**Solutions**:
1. **Check API URL**:
   ```bash
   # In frontend/.env
   VITE_API_URL=http://localhost:8000
   ```

2. **Check CORS**:
   - Backend should allow `http://localhost:3000` and `http://localhost:5173`
   - Check `main.py` CORS configuration

3. **Check Response Format**:
   - Frontend expects: `{ success: true, data: {...} }`
   - Backend might return: `{ ... }` directly
   - Add response unwrapping in api.ts

### TypeScript Errors
**Symptoms**: Type errors in IDE or build

**Solutions**:
```bash
# Check types
cd frontend
npm run type-check

# Regenerate types if needed
# Update types/index.ts to match backend schemas

# Clear TypeScript cache
rm -rf node_modules/.cache
```

### Build Errors
**Symptoms**: Vite build fails

**Solutions**:
```bash
# Clear cache and rebuild
cd frontend
rm -rf node_modules dist
npm install
npm run build

# Check for circular dependencies
# Check for missing imports
```

## Database Issues

### Slow Queries
**Symptoms**: API endpoints taking too long

**Solutions**:
1. **Add Indexes**:
   ```python
   # In model
   __table_args__ = (
       Index('idx_category_id', 'category_id'),
   )
   ```

2. **Use Eager Loading**:
   ```python
   from sqlalchemy.orm import selectinload
   
   result = await db.execute(
       select(Category).options(
           selectinload(Category.questions)
       )
   )
   ```

3. **Check Query Plans**:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM questions WHERE category_id = 'xxx';
   ```

### Data Inconsistency
**Symptoms**: Foreign key errors or orphaned records

**Solutions**:
```bash
# Check database constraints
docker-compose exec postgres psql -U scholarly -d scholarly

# List foreign keys
\d+ questions

# Find orphaned records
SELECT * FROM questions WHERE category_id NOT IN (SELECT id FROM categories);

# Fix with migration
docker-compose exec backend alembic revision -m "fix_orphaned_records"
```

## Common Error Messages

### "Module not found"
- Missing dependency in requirements.txt or package.json
- Incorrect import path
- Need to rebuild container

### "Connection refused"
- Service not running
- Wrong port number
- Firewall blocking connection

### "Permission denied"
- File permissions issue (Linux/Mac)
- Docker volume permissions
- Run with appropriate user

### "Port already in use"
- Another service using the port
- Previous container not stopped
- Kill process or change port

## Performance Issues

### Slow AI Generation
**Solutions**:
- Switch to faster provider (Groq)
- Reduce question count
- Cache analysis results
- Use async generation

### High Memory Usage
**Solutions**:
- Check for memory leaks in long-running processes
- Limit concurrent AI requests
- Optimize database queries
- Clear old logs

### Slow Page Load
**Solutions**:
- Implement pagination
- Add loading states
- Lazy load components
- Optimize images

## Getting Help

1. **Check Logs**:
   ```bash
   docker-compose logs -f backend
   docker-compose logs -f frontend
   ```

2. **Check Sentry**: View error details in Sentry dashboard

3. **Check Documentation**: README.md, DEVDOC.md, .kiro/steering/

4. **Search Issues**: Check if others encountered similar problems

5. **Debug Mode**:
   ```bash
   # Enable debug logging
   DEBUG=true docker-compose up
   ```
