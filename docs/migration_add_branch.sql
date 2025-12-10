-- Add branch column to users table if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS branch TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch);
