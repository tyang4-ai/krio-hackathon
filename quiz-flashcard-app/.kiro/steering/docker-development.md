---
inclusion: fileMatch
fileMatchPattern: "**/docker-compose.yml,**/Dockerfile,**/entrypoint.sh"
---

# Docker Development Guidelines

## Docker Compose Architecture

This project uses Docker Compose with three main services:
1. **postgres**: PostgreSQL 15 database
2. **backend**: FastAPI Python application
3. **frontend**: React + Vite development server

## Common Commands

### Starting Services
```bash
# Start all services
docker-compose up

# Start in detached mode (background)
docker-compose up -d

# Rebuild and start (after dependency changes)
docker-compose up --build

# Start specific service
docker-compose up backend
```

### Stopping Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes database data)
docker-compose down -v
```

### Viewing Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f postgres

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Executing Commands in Containers
```bash
# Run pytest tests
docker-compose exec backend pytest -v

# Create database migration
docker-compose exec backend alembic revision --autogenerate -m "description"

# Apply migrations
docker-compose exec backend alembic upgrade head

# Access PostgreSQL CLI
docker-compose exec postgres psql -U scholarly -d scholarly

# Access backend shell
docker-compose exec backend bash

# Install new Python package
docker-compose exec backend pip install package-name
# Then add to requirements.txt and rebuild
```

## Service Configuration

### Backend Service
- **Port**: 8000 (host) → 8000 (container)
- **Hot Reload**: Enabled via volume mount
- **Environment**: Loaded from `.env` file
- **Volumes**:
  - `./backend-python:/app` - Code hot reload
  - `./uploads:/app/uploads` - Persistent file storage
  - `./logs:/app/logs` - Log files

### Frontend Service
- **Port**: 3000 (host) → 3000 (container)
- **Hot Reload**: Enabled via volume mount
- **Environment**: `VITE_API_URL=http://localhost:8000`
- **Volumes**:
  - `./frontend:/app` - Code hot reload
  - `/app/node_modules` - Anonymous volume for dependencies

### PostgreSQL Service
- **Port**: 5432 (host) → 5432 (container)
- **Database**: scholarly
- **User**: scholarly
- **Password**: localdev123 (development only!)
- **Volume**: `postgres_data` - Persistent database storage

## Health Checks

### Backend Health
```bash
curl http://localhost:8000/health
```

### Database Health
```bash
docker-compose exec postgres pg_isready -U scholarly -d scholarly
```

## Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose logs backend

# Rebuild from scratch
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Database Connection Issues
```bash
# Check if postgres is healthy
docker-compose ps

# Restart postgres
docker-compose restart postgres

# Reset database (WARNING: deletes all data)
docker-compose down -v
docker-compose up
```

### Port Already in Use
```bash
# Find process using port 8000
# Windows:
netstat -ano | findstr :8000

# Kill the process or change port in docker-compose.yml
```

### Hot Reload Not Working
```bash
# For Windows, ensure WATCHFILES_FORCE_POLLING=true in .env
# Restart the service
docker-compose restart backend
```

### Permission Issues (Linux/Mac)
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
```

## Development Workflow

### Making Code Changes
1. Edit files locally (hot reload handles updates)
2. Check logs: `docker-compose logs -f backend`
3. Test changes in browser or with API calls

### Adding Dependencies

**Python (Backend)**:
```bash
# Add to requirements.txt
echo "new-package==1.0.0" >> backend-python/requirements.txt

# Rebuild
docker-compose up --build backend
```

**Node.js (Frontend)**:
```bash
# Install in container
docker-compose exec frontend npm install new-package

# Or rebuild
docker-compose up --build frontend
```

### Database Migrations
```bash
# 1. Modify models in backend-python/models/
# 2. Generate migration
docker-compose exec backend alembic revision --autogenerate -m "Add new column"

# 3. Review migration in alembic/versions/
# 4. Apply migration
docker-compose exec backend alembic upgrade head
```

## Production Considerations

- Change **database credentials** in production
- Use **environment-specific** docker-compose files
- Remove **volume mounts** for code (use COPY in Dockerfile)
- Disable **debug mode** and hot reload
- Use **production WSGI server** (already using uvicorn)
- Set up **proper logging** and monitoring
- Use **secrets management** for sensitive data
