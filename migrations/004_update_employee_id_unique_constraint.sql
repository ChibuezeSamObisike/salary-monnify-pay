-- Update unique constraints to only apply to active employees
-- This allows soft-deleted employees to be recreated with the same employee_id or email

-- Drop the existing unique constraints
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_employee_id_key;
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_email_key;

-- Create partial unique indexes that only enforce uniqueness for active employees
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_employee_id_active_unique 
ON employees(employee_id) 
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_email_active_unique 
ON employees(email) 
WHERE is_active = true;

