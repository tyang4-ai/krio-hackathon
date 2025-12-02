#!/bin/bash
# Run database migrations after deployment
# This script is executed by Elastic Beanstalk after the application is deployed

set -e

echo "Starting database migrations..."

# Navigate to app directory
cd /var/app/current

# Activate virtual environment
source /var/app/venv/*/bin/activate

# Run migrations
python -m alembic upgrade head

echo "Database migrations completed successfully!"
