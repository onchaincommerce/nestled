-- Function to create the test_entries table if it doesn't exist
CREATE OR REPLACE FUNCTION create_test_entries_if_not_exists()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'test_entries'
  ) THEN
    -- Create the table
    CREATE TABLE public.test_entries (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES auth.users(id),
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    -- Add RLS policies
    ALTER TABLE public.test_entries ENABLE ROW LEVEL SECURITY;
    
    -- Policy to allow users to select their own entries
    CREATE POLICY "Users can view their own entries" 
      ON public.test_entries
      FOR SELECT 
      USING (auth.uid() = user_id);
    
    -- Policy to allow users to insert their own entries
    CREATE POLICY "Users can insert their own entries" 
      ON public.test_entries
      FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
    
    -- Policy to allow users to update their own entries
    CREATE POLICY "Users can update their own entries" 
      ON public.test_entries
      FOR UPDATE 
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

-- Function to handle user creation when they first sign in
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into our custom users table
  INSERT INTO public.users (id, email, created_at)
  VALUES (new.id, new.email, now());
  
  RETURN new;
END;
$$;

-- Trigger to call handle_new_user when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user(); 