-- Add passage_id column to users table if it doesn't exist
DO $$
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'passage_id'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE users ADD COLUMN passage_id TEXT;
        
        -- Create an index on passage_id for faster lookups
        CREATE INDEX idx_users_passage_id ON users(passage_id);
        
        -- Add a comment explaining the column
        COMMENT ON COLUMN users.passage_id IS 'Passage.id user identifier from Passage auth service';
    END IF;
END $$; 