-- Create a function to get the current user ID from the JWT
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS TEXT AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::json->>'userId', '')::text;
$$ LANGUAGE sql STABLE;

-- Users table to store additional user information
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS to users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read and update their own user record
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (id = auth.user_id());
  
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (id = auth.user_id());

-- Couples table to represent a relationship between two users
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS to couples table
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;

-- Link between users and couples
CREATE TABLE couples_users (
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (couple_id, user_id)
);

-- Add RLS to couples_users table
ALTER TABLE couples_users ENABLE ROW LEVEL SECURITY;

-- Users can view couples they are a part of
CREATE POLICY "Users can view their own couples" ON couples
  FOR SELECT USING (
    id IN (
      SELECT couple_id FROM couples_users WHERE user_id = auth.user_id()
    )
  );

-- Users can view couple_users entries they are a part of
CREATE POLICY "Users can view their couples_users" ON couples_users
  FOR SELECT USING (
    user_id = auth.user_id() OR 
    couple_id IN (
      SELECT couple_id FROM couples_users WHERE user_id = auth.user_id()
    )
  );

-- Journal entries table
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content_encrypted TEXT,
  prompt TEXT,
  reactions JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS to journal_entries table
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Users can view and create journal entries for their couples
CREATE POLICY "Users can view their couples' journal entries" ON journal_entries
  FOR SELECT USING (
    couple_id IN (
      SELECT couple_id FROM couples_users WHERE user_id = auth.user_id()
    )
  );

CREATE POLICY "Users can create journal entries for their couples" ON journal_entries
  FOR INSERT WITH CHECK (
    author_id = auth.user_id() AND
    couple_id IN (
      SELECT couple_id FROM couples_users WHERE user_id = auth.user_id()
    )
  );

CREATE POLICY "Users can update their own journal entries" ON journal_entries
  FOR UPDATE USING (
    author_id = auth.user_id()
  );

-- Scrapbook items table
CREATE TABLE scrapbook_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE,
  media_url TEXT,
  caption TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS to scrapbook_items table
ALTER TABLE scrapbook_items ENABLE ROW LEVEL SECURITY;

-- Users can view and create scrapbook items for their couples
CREATE POLICY "Users can view their couples' scrapbook items" ON scrapbook_items
  FOR SELECT USING (
    couple_id IN (
      SELECT couple_id FROM couples_users WHERE user_id = auth.user_id()
    )
  );

CREATE POLICY "Users can create scrapbook items for their couples" ON scrapbook_items
  FOR INSERT WITH CHECK (
    author_id = auth.user_id() AND
    couple_id IN (
      SELECT couple_id FROM couples_users WHERE user_id = auth.user_id()
    )
  );

CREATE POLICY "Users can update their own scrapbook items" ON scrapbook_items
  FOR UPDATE USING (
    author_id = auth.user_id()
  );

-- Date events table
CREATE TABLE date_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  notes TEXT,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE,
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Add RLS to date_events table
ALTER TABLE date_events ENABLE ROW LEVEL SECURITY;

-- Users can view and create date events for their couples
CREATE POLICY "Users can view their couples' date events" ON date_events
  FOR SELECT USING (
    couple_id IN (
      SELECT couple_id FROM couples_users WHERE user_id = auth.user_id()
    )
  );

CREATE POLICY "Users can create date events for their couples" ON date_events
  FOR INSERT WITH CHECK (
    created_by = auth.user_id() AND
    couple_id IN (
      SELECT couple_id FROM couples_users WHERE user_id = auth.user_id()
    )
  );

CREATE POLICY "Users can update date events for their couples" ON date_events
  FOR UPDATE USING (
    couple_id IN (
      SELECT couple_id FROM couples_users WHERE user_id = auth.user_id()
    )
  ); 