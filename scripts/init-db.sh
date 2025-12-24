#!/bin/bash

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h localhost -p 5433 -U payroll_user; do
  sleep 1
done

echo "PostgreSQL is ready!"

# Run migrations
echo "Running database migrations..."
for migration in migrations/*.sql; do
  echo "Running migration: $migration"
  PGPASSWORD=payroll_password psql -h localhost -p 5433 -U payroll_user -d payroll_db -f "$migration"
done

echo "Database initialization complete!"

