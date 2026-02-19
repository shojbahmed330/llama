
-- ============================================================
-- ONECLICK STUDIO | FULL DATABASE SCHEMA & SECURITY POLICIES
-- Generated: February 2025
-- Features: Dynamic Admin Control, Activity Logging, Realtime Sync
-- ============================================================

-- ============================================================
-- 1. DATABASE EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 2. CORE SYSTEM TABLES
-- ============================================================

-- USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  tokens INTEGER DEFAULT 10,
  avatar_url TEXT,
  bio TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_banned BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  github_token TEXT,
  github_owner TEXT,
  github_repo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  files JSONB DEFAULT '{}'::jsonb,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- PROJECT HISTORY (Snapshots)
CREATE TABLE IF NOT EXISTS public.project_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  files JSONB NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- CRITICAL SCHEMA MIGRATIONS (Ensure all columns exist)
DO $$ 
BEGIN 
  -- Fix for Users table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_admin') THEN
    ALTER TABLE public.users ADD COLUMN is_admin BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_verified') THEN
    ALTER TABLE public.users ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;

  -- Fix for Projects table (Addressing the error in user screenshot)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='config') THEN
    ALTER TABLE public.projects ADD COLUMN config JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='files') THEN
    ALTER TABLE public.projects ADD COLUMN files JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- PACKAGES TABLE
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  price INTEGER NOT NULL,
  color TEXT DEFAULT 'pink',
  icon TEXT DEFAULT 'Package',
  is_popular BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  package_id uuid REFERENCES public.packages(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  payment_method TEXT NOT NULL,
  trx_id TEXT UNIQUE,
  screenshot_url TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id TEXT,
  admin_email TEXT,
  action TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- ============================================================
-- 3. REALTIME SYNC CONFIGURATION
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname='supabase_realtime' AND tablename='transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname='supabase_realtime' AND tablename='activity_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
  END IF;
END $$;

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS) INITIALIZATION
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- CLEANUP POLICIES
DO $$ DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname='public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename;
    END LOOP;
END $$;

-- ============================================================
-- 5. ADVANCED SECURITY FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_check()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
    OR (auth.jwt() ->> 'email' = 'rajshahi.jibon@gmail.com')
    OR (auth.uid() = '329a8566-838f-4e61-a91c-2e6c6d492420')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. DETAILED RLS POLICIES
-- ============================================================

-- USERS POLICIES
CREATE POLICY "users_read_own_profile" ON public.users FOR SELECT
USING (auth.uid() = id OR is_admin_check());

CREATE POLICY "users_update_own_profile" ON public.users FOR UPDATE
USING (auth.uid() = id OR is_admin_check());

CREATE POLICY "admin_manage_all_users" ON public.users FOR ALL
USING (is_admin_check());

-- PACKAGES POLICIES
CREATE POLICY "anyone_read_packages" ON public.packages FOR SELECT
USING (true);

CREATE POLICY "admin_manage_packages" ON public.packages FOR ALL
USING (is_admin_check());

-- TRANSACTIONS POLICIES
CREATE POLICY "users_view_own_transactions" ON public.transactions FOR SELECT
USING (auth.uid() = user_id OR is_admin_check());

CREATE POLICY "users_create_transaction_requests" ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_full_transaction_control" ON public.transactions FOR ALL
USING (is_admin_check());

-- PROJECTS POLICIES
CREATE POLICY "users_project_access" ON public.projects FOR ALL
USING (auth.uid() = user_id OR is_admin_check())
WITH CHECK (auth.uid() = user_id OR is_admin_check());

-- PROJECT HISTORY POLICIES
CREATE POLICY "users_history_access" ON public.project_history FOR ALL
USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_history.project_id AND user_id = auth.uid()) OR is_admin_check());

-- LOGS POLICIES
CREATE POLICY "admin_audit_logs_access" ON public.activity_logs FOR ALL
USING (is_admin_check());

-- ============================================================
-- 7. AUTOMATED TRIGGER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, tokens, is_admin)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    10,
    CASE WHEN new.email = 'rajshahi.jibon@gmail.com' THEN true ELSE false END
  )
  ON CONFLICT (id) DO UPDATE SET is_admin = EXCLUDED.is_admin, email = EXCLUDED.email;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_user_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.tokens <> NEW.tokens THEN
    INSERT INTO activity_logs(admin_email, action, details)
    VALUES (
      COALESCE(auth.jwt()->>'email','SYSTEM'),
      'CREDIT_SYNC',
      'User: ' || NEW.email || ' | ' || OLD.tokens || ' -> ' || NEW.tokens || ' Tokens'
    );
  END IF;

  IF OLD.is_banned <> NEW.is_banned THEN
    INSERT INTO activity_logs(admin_email, action, details)
    VALUES (
      COALESCE(auth.jwt()->>'email','SYSTEM'),
      CASE WHEN NEW.is_banned THEN 'SYSTEM_BAN' ELSE 'SYSTEM_RECOVERY' END,
      'Target: ' || NEW.email
    );
  END IF;

  IF OLD.is_admin <> NEW.is_admin THEN
    INSERT INTO activity_logs(admin_email, action, details)
    VALUES (
      COALESCE(auth.jwt()->>'email','SYSTEM'),
      'AUTH_MODIFICATION',
      'Admin privilege ' || (CASE WHEN NEW.is_admin THEN 'granted to ' ELSE 'revoked from ' END) || NEW.email
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_project_time()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 8. SYSTEM TRIGGERS ATTACHMENT
-- ============================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS monitor_user_updates ON public.users;
CREATE TRIGGER monitor_user_updates
AFTER UPDATE ON public.users
FOR EACH ROW EXECUTE PROCEDURE public.log_user_changes();

DROP TRIGGER IF EXISTS project_auto_timestamp ON public.projects;
CREATE TRIGGER project_auto_timestamp
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE PROCEDURE public.sync_project_time();

-- ============================================================
-- 9. SEED DATA & INITIALIZATION
-- ============================================================

-- Forcefully ensure the admin email has the role
UPDATE public.users 
SET is_admin = true, is_verified = true
WHERE email = 'rajshahi.jibon@gmail.com';

-- Default Startup Packages
INSERT INTO public.packages (name, tokens, price, color, icon, is_popular)
VALUES
('Starter Pack', 50, 500, 'cyan', 'Package', false),
('Professional Hub', 250, 1500, 'pink', 'Rocket', true),
('Agency Ultimate', 1200, 5000, 'amber', 'Cpu', false)
ON CONFLICT DO NOTHING;

-- Log System Bootup
INSERT INTO activity_logs (admin_email, action, details)
VALUES ('SYSTEM', 'BOOT_COMPLETE', 'OneClick Studio Core Database Initialized Successfully');
