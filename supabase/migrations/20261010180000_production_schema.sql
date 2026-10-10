-- Purusharth Studio Production Schema
-- Migration: 20261010180000_production_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLES DEFINITION
-- ============================================================================

-- Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  email text,
  phone text,
  city text,
  avatar_key text,
  avatar_url text,
  selfie_key text,
  selfie_url text,
  role text DEFAULT 'client' CHECK (role IN ('super_admin', 'admin', 'client')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date text,
  location text,
  cover_key text,
  cover_url text,
  created_by uuid REFERENCES public.profiles(id),
  status text DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  total_photos int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Event Admins Table
CREATE TABLE IF NOT EXISTS public.event_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  admin_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES public.profiles(id),
  assigned_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (event_id, admin_id)
);

-- Event Codes Table
CREATE TABLE IF NOT EXISTS public.event_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  expires_at timestamptz,
  max_uses int DEFAULT 1000,
  use_count int DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Event Members Table
CREATE TABLE IF NOT EXISTS public.event_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  granted_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  source_code_id uuid REFERENCES public.event_codes(id),
  UNIQUE (event_id, user_id)
);

-- Collections Table
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  cover_key text,
  cover_url text,
  visibility text DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_by uuid REFERENCES public.profiles(id),
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Media Table
CREATE TABLE IF NOT EXISTS public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES public.profiles(id),
  object_key text NOT NULL,
  thumbnail_key text,
  url text NOT NULL,
  media_type text DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  mime_type text,
  size_bytes bigint,
  title text,
  status text DEFAULT 'ready' CHECK (status IN ('uploading', 'ready', 'failed')),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Collection Media Table
CREATE TABLE IF NOT EXISTS public.collection_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE,
  media_id uuid REFERENCES public.media(id) ON DELETE CASCADE,
  sort_order int DEFAULT 0,
  UNIQUE (collection_id, media_id)
);

-- Admin Invites Table
CREATE TABLE IF NOT EXISTS public.admin_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  expires_at timestamptz,
  max_uses int DEFAULT 5,
  use_count int DEFAULT 0,
  status text DEFAULT 'active' CHECK (status IN ('active', 'used', 'revoked')),
  accepted_by uuid REFERENCES public.profiles(id),
  approved_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES public.profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  event_id uuid REFERENCES public.events(id),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 2. INDEXES (Foreign keys & query performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);

CREATE INDEX IF NOT EXISTS idx_event_admins_event_id ON public.event_admins(event_id);
CREATE INDEX IF NOT EXISTS idx_event_admins_admin_id ON public.event_admins(admin_id);
CREATE INDEX IF NOT EXISTS idx_event_admins_assigned_by ON public.event_admins(assigned_by);

CREATE INDEX IF NOT EXISTS idx_event_codes_event_id ON public.event_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_codes_created_by ON public.event_codes(created_by);
CREATE INDEX IF NOT EXISTS idx_event_codes_code ON public.event_codes(code);

CREATE INDEX IF NOT EXISTS idx_event_members_event_id ON public.event_members(event_id);
CREATE INDEX IF NOT EXISTS idx_event_members_user_id ON public.event_members(user_id);
CREATE INDEX IF NOT EXISTS idx_event_members_source_code_id ON public.event_members(source_code_id);

CREATE INDEX IF NOT EXISTS idx_collections_created_by ON public.collections(created_by);
CREATE INDEX IF NOT EXISTS idx_collections_visibility ON public.collections(visibility);

CREATE INDEX IF NOT EXISTS idx_media_event_id ON public.media(event_id);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_by ON public.media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_media_status_deleted ON public.media(status, deleted_at);

CREATE INDEX IF NOT EXISTS idx_collection_media_collection_id ON public.collection_media(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_media_media_id ON public.collection_media(media_id);

CREATE INDEX IF NOT EXISTS idx_admin_invites_code ON public.admin_invites(code);
CREATE INDEX IF NOT EXISTS idx_admin_invites_created_by ON public.admin_invites(created_by);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_id ON public.audit_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================================================
-- 3. HELPER FUNCTIONS FOR SECURITY & RLS
-- ============================================================================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_events_updated_at ON public.events;
CREATE TRIGGER set_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- User role lookup helper (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1;
$$;

-- Super admin check helper
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'super_admin' FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1),
    false
  );
$$;

-- Admin check helper (super_admin OR admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('super_admin', 'admin') FROM public.profiles WHERE id = (SELECT auth.uid()) LIMIT 1),
    false
  );
$$;

-- Event admin check helper
CREATE OR REPLACE FUNCTION public.is_event_admin(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT true FROM public.profiles WHERE id = (SELECT auth.uid()) AND role = 'super_admin' LIMIT 1),
    EXISTS (
      SELECT 1 FROM public.event_admins
      WHERE event_id = p_event_id
        AND admin_id = (SELECT auth.uid())
        AND revoked_at IS NULL
    ),
    false
  );
$$;

-- Event member check helper
CREATE OR REPLACE FUNCTION public.is_event_member(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT true FROM public.profiles WHERE id = (SELECT auth.uid()) AND role IN ('super_admin', 'admin') LIMIT 1),
    EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_id = p_event_id
        AND user_id = (SELECT auth.uid())
        AND status = 'active'
    ),
    false
  );
$$;

-- ============================================================================
-- 4. AUTH TRIGGER & USER SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_display_name text;
  v_invite_code text;
  v_role text := 'client';
  v_invite_id uuid;
  v_user_count int;
BEGIN
  -- Extract display name from metadata or fallback to email prefix
  v_display_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  v_invite_code := trim(COALESCE(NEW.raw_user_meta_data->>'invite_code', ''));

  -- Check if this is the first user ever, or the designated super admin email
  SELECT count(*) INTO v_user_count FROM public.profiles;

  IF lower(NEW.email) = 'admin@purusharthstudio.com' OR v_user_count = 0 THEN
    v_role := 'super_admin';
  ELSIF v_invite_code <> '' THEN
    -- Check for valid admin invite
    SELECT id INTO v_invite_id
    FROM public.admin_invites
    WHERE upper(code) = upper(v_invite_code)
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
      AND use_count < max_uses
    LIMIT 1;

    IF v_invite_id IS NOT NULL THEN
      v_role := 'admin';
      
      -- Update invite usage
      UPDATE public.admin_invites
      SET use_count = use_count + 1,
          accepted_by = NEW.id,
          status = CASE WHEN use_count + 1 >= max_uses THEN 'used' ELSE 'active' END
      WHERE id = v_invite_id;
    END IF;
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (
    id,
    display_name,
    email,
    phone,
    role,
    status
  ) VALUES (
    NEW.id,
    v_display_name,
    NEW.email,
    NEW.phone,
    v_role,
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = now();

  -- Audit log signup
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    NEW.id,
    'user_signup',
    'profiles',
    NEW.id::text,
    jsonb_build_object('role', v_role, 'email', NEW.email, 'invite_code', v_invite_code)
  );

  RETURN NEW;
END;
$$;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 5. STORED PROCEDURES / RPCs
-- ============================================================================

-- join_event_by_code
CREATE OR REPLACE FUNCTION public.join_event_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code RECORD;
  v_event RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event code cannot be empty');
  END IF;

  -- Find matching active code
  SELECT * INTO v_code
  FROM public.event_codes
  WHERE upper(trim(code)) = upper(trim(p_code))
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired event code');
  END IF;

  -- Find event
  SELECT * INTO v_event
  FROM public.events
  WHERE id = v_code.event_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event is not active or could not be found');
  END IF;

  -- Check if already member
  IF EXISTS (
    SELECT 1 FROM public.event_members
    WHERE event_id = v_code.event_id AND user_id = v_user_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_member', true,
      'event', jsonb_build_object(
        'id', v_event.id,
        'title', v_event.title,
        'description', v_event.description,
        'event_date', v_event.event_date,
        'location', v_event.location,
        'cover_url', v_event.cover_url
      )
    );
  END IF;

  -- Add membership
  INSERT INTO public.event_members (event_id, user_id, source_code_id, status)
  VALUES (v_code.event_id, v_user_id, v_code.id, 'active')
  ON CONFLICT (event_id, user_id)
  DO UPDATE SET status = 'active', source_code_id = v_code.id, granted_at = now();

  -- Increment use count
  UPDATE public.event_codes
  SET use_count = use_count + 1,
      status = CASE WHEN max_uses IS NOT NULL AND use_count + 1 >= max_uses THEN 'expired' ELSE status END
  WHERE id = v_code.id;

  -- Audit log
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, event_id, metadata)
  VALUES (v_user_id, 'event_joined', 'events', v_event.id::text, v_event.id, jsonb_build_object('code', p_code));

  RETURN jsonb_build_object(
    'success', true,
    'already_member', false,
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'description', v_event.description,
      'event_date', v_event.event_date,
      'location', v_event.location,
      'cover_url', v_event.cover_url
    )
  );
END;
$$;

-- verify_and_use_admin_code
CREATE OR REPLACE FUNCTION public.verify_and_use_admin_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_invite RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF p_code IS NULL OR trim(p_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invite code cannot be empty');
  END IF;

  SELECT * INTO v_invite
  FROM public.admin_invites
  WHERE upper(trim(code)) = upper(trim(p_code))
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
    AND use_count < max_uses;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired admin invite code');
  END IF;

  -- Elevate role to admin
  UPDATE public.profiles
  SET role = 'admin', updated_at = now()
  WHERE id = v_user_id;

  -- Update invite count
  UPDATE public.admin_invites
  SET use_count = use_count + 1,
      accepted_by = v_user_id,
      status = CASE WHEN use_count + 1 >= max_uses THEN 'used' ELSE 'active' END
  WHERE id = v_invite.id;

  -- Audit log
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (v_user_id, 'admin_invite_redeemed', 'admin_invites', v_invite.id::text, jsonb_build_object('code', p_code));

  RETURN jsonb_build_object('success', true, 'message', 'Admin privileges granted successfully', 'role', 'admin');
END;
$$;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profiles_update_self_or_superadmin" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id OR (SELECT public.is_super_admin()))
  WITH CHECK ((SELECT auth.uid()) = id OR (SELECT public.is_super_admin()));

CREATE POLICY "profiles_insert_self_or_superadmin" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id OR (SELECT public.is_super_admin()));

CREATE POLICY "profiles_delete_superadmin" ON public.profiles
  FOR DELETE TO authenticated
  USING ((SELECT public.is_super_admin()));

-- EVENTS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events_select_policy" ON public.events
  FOR SELECT TO anon, authenticated
  USING (
    status = 'active'
    OR (SELECT public.is_super_admin())
    OR (SELECT public.is_event_admin(id))
  );

CREATE POLICY "events_insert_superadmin" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_super_admin()));

CREATE POLICY "events_update_policy" ON public.events
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_super_admin()) OR (SELECT public.is_event_admin(id)))
  WITH CHECK ((SELECT public.is_super_admin()) OR (SELECT public.is_event_admin(id)));

CREATE POLICY "events_delete_superadmin" ON public.events
  FOR DELETE TO authenticated
  USING ((SELECT public.is_super_admin()));

-- EVENT ADMINS
ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_admins_select_policy" ON public.event_admins
  FOR SELECT TO authenticated
  USING ((SELECT public.is_super_admin()) OR admin_id = (SELECT auth.uid()));

CREATE POLICY "event_admins_manage_policy" ON public.event_admins
  FOR ALL TO authenticated
  USING ((SELECT public.is_super_admin()))
  WITH CHECK ((SELECT public.is_super_admin()));

-- EVENT CODES
ALTER TABLE public.event_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_codes_select_policy" ON public.event_codes
  FOR SELECT TO authenticated
  USING ((SELECT public.is_super_admin()) OR (SELECT public.is_event_admin(event_id)));

CREATE POLICY "event_codes_insert_policy" ON public.event_codes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_super_admin()) OR (SELECT public.is_event_admin(event_id)));

CREATE POLICY "event_codes_update_policy" ON public.event_codes
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_super_admin()) OR (SELECT public.is_event_admin(event_id)))
  WITH CHECK ((SELECT public.is_super_admin()) OR (SELECT public.is_event_admin(event_id)));

CREATE POLICY "event_codes_delete_policy" ON public.event_codes
  FOR DELETE TO authenticated
  USING ((SELECT public.is_super_admin()));

-- EVENT MEMBERS
ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_members_select_policy" ON public.event_members
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_super_admin())
    OR (SELECT public.is_event_admin(event_id))
    OR user_id = (SELECT auth.uid())
  );

CREATE POLICY "event_members_insert_policy" ON public.event_members
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_super_admin())
    OR (SELECT public.is_event_admin(event_id))
    OR user_id = (SELECT auth.uid())
  );

CREATE POLICY "event_members_update_policy" ON public.event_members
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_super_admin()) OR (SELECT public.is_event_admin(event_id)));

CREATE POLICY "event_members_delete_policy" ON public.event_members
  FOR DELETE TO authenticated
  USING ((SELECT public.is_super_admin()) OR (SELECT public.is_event_admin(event_id)));

-- COLLECTIONS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_select_policy" ON public.collections
  FOR SELECT TO anon, authenticated
  USING (visibility = 'public' OR (SELECT public.is_admin()));

CREATE POLICY "collections_insert_admin" ON public.collections
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "collections_update_admin" ON public.collections
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "collections_delete_superadmin" ON public.collections
  FOR DELETE TO authenticated
  USING ((SELECT public.is_super_admin()));

-- MEDIA
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_select_policy" ON public.media
  FOR SELECT TO anon, authenticated
  USING (
    deleted_at IS NULL AND (
      (SELECT public.is_super_admin())
      OR (event_id IS NOT NULL AND (SELECT public.is_event_member(event_id)))
      OR EXISTS (
        SELECT 1 FROM public.collection_media cm
        JOIN public.collections c ON c.id = cm.collection_id
        WHERE cm.media_id = media.id AND c.visibility = 'public'
      )
    )
  );

CREATE POLICY "media_insert_policy" ON public.media
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_super_admin())
    OR (event_id IS NOT NULL AND (SELECT public.is_event_admin(event_id)))
  );

CREATE POLICY "media_update_policy" ON public.media
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.is_super_admin())
    OR (event_id IS NOT NULL AND (SELECT public.is_event_admin(event_id)))
  )
  WITH CHECK (
    (SELECT public.is_super_admin())
    OR (event_id IS NOT NULL AND (SELECT public.is_event_admin(event_id)))
  );

CREATE POLICY "media_delete_policy" ON public.media
  FOR DELETE TO authenticated
  USING (
    (SELECT public.is_super_admin())
    OR (event_id IS NOT NULL AND (SELECT public.is_event_admin(event_id)))
  );

-- COLLECTION MEDIA
ALTER TABLE public.collection_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collection_media_select_policy" ON public.collection_media
  FOR SELECT TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_media.collection_id AND c.visibility = 'public'
    )
  );

CREATE POLICY "collection_media_manage_policy" ON public.collection_media
  FOR ALL TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- ADMIN INVITES
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_invites_select_superadmin" ON public.admin_invites
  FOR SELECT TO authenticated
  USING ((SELECT public.is_super_admin()));

CREATE POLICY "admin_invites_insert_superadmin" ON public.admin_invites
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_super_admin()));

CREATE POLICY "admin_invites_update_superadmin" ON public.admin_invites
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_super_admin()))
  WITH CHECK ((SELECT public.is_super_admin()));

CREATE POLICY "admin_invites_delete_superadmin" ON public.admin_invites
  FOR DELETE TO authenticated
  USING ((SELECT public.is_super_admin()));

-- AUDIT LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_superadmin" ON public.audit_logs
  FOR SELECT TO authenticated
  USING ((SELECT public.is_super_admin()));

CREATE POLICY "audit_logs_insert_authenticated" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- 7. ROLES & GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.events, public.collections, public.media, public.collection_media TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_event_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_event_member(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon, authenticated;

-- ============================================================================
-- 8. INITIAL SEED DATA
-- ============================================================================

-- Seed Events
INSERT INTO public.events (id, title, description, event_date, location, cover_key, cover_url, status, total_photos)
VALUES
  (
    'b1a11111-1111-4111-8111-111111111111',
    'The Royal Udaipur Wedding',
    'A majestic three-day celebration of heritage, royal traditions, and timeless love amidst the palaces of Udaipur.',
    '2024-11-20',
    'City Palace & Jagmandir Island, Udaipur',
    'events/udaipur-cover.jpg',
    'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/events/udaipur-cover.jpg',
    'active',
    142
  ),
  (
    'b2a22222-2222-4222-8222-222222222222',
    'Oberoi Heritage Gala 2024',
    'An exclusive evening of luxury, classical performances, and grand architectural grandeur at The Oberoi Rajvilas.',
    '2024-12-15',
    'The Oberoi Rajvilas, Jaipur',
    'events/oberoi-cover.jpg',
    'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/events/oberoi-cover.jpg',
    'active',
    88
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  event_date = EXCLUDED.event_date,
  location = EXCLUDED.location,
  cover_url = EXCLUDED.cover_url,
  status = EXCLUDED.status,
  total_photos = EXCLUDED.total_photos;

-- Seed Event Codes
INSERT INTO public.event_codes (event_id, code, max_uses, use_count, status)
VALUES
  ('b1a11111-1111-4111-8111-111111111111', 'UDAIPUR-24', 1000, 0, 'active'),
  ('b2a22222-2222-4222-8222-222222222222', 'OBEROI-GL', 1000, 0, 'active')
ON CONFLICT (code) DO UPDATE SET
  event_id = EXCLUDED.event_id,
  max_uses = EXCLUDED.max_uses,
  status = EXCLUDED.status;

-- Seed Admin Invite Code
INSERT INTO public.admin_invites (code, max_uses, use_count, status)
VALUES
  ('INVITE-2025', 5, 0, 'active')
ON CONFLICT (code) DO UPDATE SET
  max_uses = EXCLUDED.max_uses,
  status = EXCLUDED.status;

-- Seed Curated Collections
INSERT INTO public.collections (id, title, description, cover_key, cover_url, visibility)
VALUES
  (
    'c1a11111-1111-4111-8111-111111111111',
    'Royal Portraits & Heritage Moments',
    'Masterpiece portraits capturing the regal grandeur and emotional depths of the celebration.',
    'collections/portraits-cover.jpg',
    'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/collections/portraits-cover.jpg',
    'public'
  ),
  (
    'c2a22222-2222-4222-8222-222222222222',
    'The Golden Hour Serenade',
    'Warm sunsets, candlelight banquets, and intimate family moments under palace chandeliers.',
    'collections/golden-hour-cover.jpg',
    'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/collections/golden-hour-cover.jpg',
    'public'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  cover_url = EXCLUDED.cover_url,
  visibility = EXCLUDED.visibility;

-- Seed Sample Media
INSERT INTO public.media (id, event_id, object_key, thumbnail_key, url, media_type, mime_type, size_bytes, title, status)
VALUES
  (
    'm1a11111-1111-4111-8111-111111111111',
    'b1a11111-1111-4111-8111-111111111111',
    'media/udaipur-01.jpg',
    'media/udaipur-01-thumb.jpg',
    'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/media/udaipur-01.jpg',
    'photo',
    'image/jpeg',
    4210000,
    'Jagmandir Sunset Procession',
    'ready'
  ),
  (
    'm2a22222-2222-4222-8222-222222222222',
    'b1a11111-1111-4111-8111-111111111111',
    'media/udaipur-02.jpg',
    'media/udaipur-02-thumb.jpg',
    'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/media/udaipur-02.jpg',
    'photo',
    'image/jpeg',
    5120000,
    'City Palace Courtyard Vows',
    'ready'
  ),
  (
    'm3a33333-3333-4333-8333-333333333333',
    'b2a22222-2222-4222-8222-222222222222',
    'media/oberoi-01.jpg',
    'media/oberoi-01-thumb.jpg',
    'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/media/oberoi-01.jpg',
    'photo',
    'image/jpeg',
    3840000,
    'Rajvilas Fountain Lighting',
    'ready'
  ),
  (
    'm4a44444-4444-4444-8444-444444444444',
    'b2a22222-2222-4222-8222-222222222222',
    'media/oberoi-02.jpg',
    'media/oberoi-02-thumb.jpg',
    'https://pub-9d4e540702114b88b33aac6b160ce50f.r2.dev/media/oberoi-02.jpg',
    'photo',
    'image/jpeg',
    6100000,
    'Classical Sitar Performance',
    'ready'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  url = EXCLUDED.url,
  status = EXCLUDED.status;

-- Seed Collection Media links
INSERT INTO public.collection_media (collection_id, media_id, sort_order)
VALUES
  ('c1a11111-1111-4111-8111-111111111111', 'm1a11111-1111-4111-8111-111111111111', 1),
  ('c1a11111-1111-4111-8111-111111111111', 'm3a33333-3333-4333-8333-333333333333', 2),
  ('c2a22222-2222-4222-8222-222222222222', 'm2a22222-2222-4222-8222-222222222222', 1),
  ('c2a22222-2222-4222-8222-222222222222', 'm4a44444-4444-4444-8444-444444444444', 2)
ON CONFLICT (collection_id, media_id) DO UPDATE SET
  sort_order = EXCLUDED.sort_order;
