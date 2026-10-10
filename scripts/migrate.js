const { Client } = require('pg');

async function runMigration() {
  const client = new Client({
    host: 'db.jddzvxctbrqtpodscnnp.supabase.co',
    port: 5432,
    user: 'postgres',
    password: process.env.EXPO_PRIVATE_SUPABASE_PASSWD || 'kBVdg1XBzRbpEN8G',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connecting to Supabase Postgres...');
  await client.connect();
  console.log('Connected!');

  const sql = `
  -- 1. CLEAN OLD SCHEMA
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
  DROP FUNCTION IF EXISTS public.admin_update_booking_status CASCADE;
  DROP FUNCTION IF EXISTS public.get_admin_dashboard_data CASCADE;
  DROP FUNCTION IF EXISTS public.admin_update_user_role CASCADE;

  DROP TABLE IF EXISTS public.collection_media CASCADE;
  DROP TABLE IF EXISTS public.collections CASCADE;
  DROP TABLE IF EXISTS public.media CASCADE;
  DROP TABLE IF EXISTS public.event_members CASCADE;
  DROP TABLE IF EXISTS public.event_codes CASCADE;
  DROP TABLE IF EXISTS public.event_admins CASCADE;
  DROP TABLE IF EXISTS public.admin_invites CASCADE;
  DROP TABLE IF EXISTS public.audit_logs CASCADE;
  DROP TABLE IF EXISTS public.events CASCADE;
  DROP TABLE IF EXISTS public.bookings CASCADE;
  DROP TABLE IF EXISTS public.profiles CASCADE;

  -- Clean old test auth users to start fresh
  DELETE FROM auth.users;

  -- 2. CREATE NEW TABLES
  
  -- PROFILES TABLE
  CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    email TEXT,
    phone TEXT,
    city TEXT,
    avatar_key TEXT,
    avatar_url TEXT,
    selfie_key TEXT,
    selfie_url TEXT,
    role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('super_admin', 'admin', 'client')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- EVENTS TABLE
  CREATE TABLE public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT,
    location TEXT,
    cover_key TEXT,
    cover_url TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
    total_photos INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- EVENT ADMINS TABLE
  CREATE TABLE public.event_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    UNIQUE (event_id, admin_id)
  );

  -- EVENT CODES TABLE
  CREATE TABLE public.event_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    max_uses INT NOT NULL DEFAULT 1000,
    use_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- EVENT MEMBERS TABLE
  CREATE TABLE public.event_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    source_code_id UUID REFERENCES public.event_codes(id) ON DELETE SET NULL,
    UNIQUE (event_id, user_id)
  );

  -- COLLECTIONS TABLE (Shared Curated Lookbooks)
  CREATE TABLE public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    cover_key TEXT,
    cover_url TEXT,
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- MEDIA TABLE (Photos and Videos stored in Cloudflare R2)
  CREATE TABLE public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    object_key TEXT NOT NULL,
    thumbnail_key TEXT,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    media_type TEXT NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
    mime_type TEXT,
    size_bytes BIGINT,
    title TEXT,
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'ready', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
  );

  -- COLLECTION MEDIA TABLE
  CREATE TABLE public.collection_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
    sort_order INT NOT NULL DEFAULT 0,
    UNIQUE (collection_id, media_id)
  );

  -- ADMIN INVITES TABLE
  CREATE TABLE public.admin_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    max_uses INT NOT NULL DEFAULT 5,
    use_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'revoked')),
    accepted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- AUDIT LOGS TABLE
  CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- 3. INDEXES FOR HIGH PERFORMANCE
  CREATE INDEX idx_profiles_role ON public.profiles (role);
  CREATE INDEX idx_profiles_email ON public.profiles (email);
  CREATE INDEX idx_profiles_phone ON public.profiles (phone);

  CREATE INDEX idx_events_created_by ON public.events (created_by);
  CREATE INDEX idx_events_status ON public.events (status);

  CREATE INDEX idx_event_admins_event ON public.event_admins (event_id);
  CREATE INDEX idx_event_admins_admin ON public.event_admins (admin_id);

  CREATE INDEX idx_event_codes_event ON public.event_codes (event_id);
  CREATE INDEX idx_event_codes_code ON public.event_codes (code);

  CREATE INDEX idx_event_members_event ON public.event_members (event_id);
  CREATE INDEX idx_event_members_user ON public.event_members (user_id);

  CREATE INDEX idx_media_event ON public.media (event_id);
  CREATE INDEX idx_media_uploaded_by ON public.media (uploaded_by);
  CREATE INDEX idx_media_status ON public.media (status);

  CREATE INDEX idx_collection_media_col ON public.collection_media (collection_id);
  CREATE INDEX idx_collection_media_med ON public.collection_media (media_id);

  CREATE INDEX idx_admin_invites_code ON public.admin_invites (code);
  CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_id);
  CREATE INDEX idx_audit_logs_event ON public.audit_logs (event_id);

  -- 4. HELPER ROLES FUNCTIONS (SECURITY DEFINER)
  CREATE OR REPLACE FUNCTION public.is_super_admin()
  RETURNS BOOLEAN
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public
  STABLE
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'super_admin'
    );
  $$;

  CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS BOOLEAN
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public
  STABLE
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role IN ('super_admin', 'admin')
    );
  $$;

  CREATE OR REPLACE FUNCTION public.is_event_admin(p_event_id UUID)
  RETURNS BOOLEAN
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public
  STABLE
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid())
        AND role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.event_admins
      WHERE event_id = p_event_id
        AND admin_id = (SELECT auth.uid())
        AND revoked_at IS NULL
    );
  $$;

  CREATE OR REPLACE FUNCTION public.is_event_member(p_event_id UUID)
  RETURNS BOOLEAN
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public
  STABLE
  AS $$
    SELECT EXISTS (
      SELECT 1 FROM public.event_members
      WHERE event_id = p_event_id
        AND user_id = (SELECT auth.uid())
        AND status = 'active'
    )
    OR public.is_event_admin(p_event_id);
  $$;

  -- 5. AUTH TRIGGER TO CREATE PROFILE ON USER SIGNUP
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_role TEXT := 'client';
    v_name TEXT;
    v_invite_code TEXT;
    v_total_profiles INT;
  BEGIN
    SELECT count(*) INTO v_total_profiles FROM public.profiles;
    
    v_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    );

    v_invite_code := NEW.raw_user_meta_data->>'invite_code';

    -- First registered user or super admin email is assigned super_admin role
    IF v_total_profiles = 0 OR NEW.email IN ('admin@purusharthstudio.com', 'superadmin@purusharthstudio.com') THEN
      v_role := 'super_admin';
    ELSIF v_invite_code IS NOT NULL THEN
      -- Check if valid admin invite
      IF EXISTS (
        SELECT 1 FROM public.admin_invites
        WHERE UPPER(code) = UPPER(v_invite_code)
          AND status = 'active'
          AND (expires_at IS NULL OR expires_at > now())
          AND use_count < max_uses
      ) THEN
        v_role := 'admin';
        UPDATE public.admin_invites
        SET use_count = use_count + 1,
            accepted_by = NEW.id,
            status = CASE WHEN use_count + 1 >= max_uses THEN 'used' ELSE 'active' END
        WHERE UPPER(code) = UPPER(v_invite_code);
      END IF;
    END IF;

    INSERT INTO public.profiles (
      id,
      display_name,
      email,
      phone,
      role,
      status
    ) VALUES (
      NEW.id,
      v_name,
      NEW.email,
      NEW.phone,
      v_role,
      'active'
    );

    RETURN NEW;
  END;
  $$;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

  -- 6. RPC: JOIN EVENT BY CODE
  CREATE OR REPLACE FUNCTION public.join_event_by_code(p_code TEXT)
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_user_id UUID := (SELECT auth.uid());
    v_event_code RECORD;
    v_event RECORD;
  BEGIN
    IF v_user_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'You must be logged in.');
    END IF;

    SELECT * INTO v_event_code
    FROM public.event_codes
    WHERE UPPER(code) = UPPER(TRIM(p_code))
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now());

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired event code.');
    END IF;

    IF v_event_code.use_count >= v_event_code.max_uses THEN
      RETURN jsonb_build_object('success', false, 'message', 'This event code has reached its usage limit.');
    END IF;

    SELECT * INTO v_event FROM public.events WHERE id = v_event_code.event_id;

    -- Insert membership if not already joined
    INSERT INTO public.event_members (event_id, user_id, source_code_id, status)
    VALUES (v_event_code.event_id, v_user_id, v_event_code.id, 'active')
    ON CONFLICT (event_id, user_id) DO NOTHING;

    -- Increment usage count
    UPDATE public.event_codes
    SET use_count = use_count + 1
    WHERE id = v_event_code.id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Event access granted!',
      'event_id', v_event.id,
      'title', v_event.title,
      'description', v_event.description,
      'cover_url', v_event.cover_url
    );
  END;
  $$;

  -- 7. RPC: USE ADMIN INVITE CODE
  CREATE OR REPLACE FUNCTION public.use_admin_invite_code(p_code TEXT)
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  DECLARE
    v_user_id UUID := (SELECT auth.uid());
    v_invite RECORD;
  BEGIN
    IF v_user_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'message', 'You must be logged in.');
    END IF;

    SELECT * INTO v_invite
    FROM public.admin_invites
    WHERE UPPER(code) = UPPER(TRIM(p_code))
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now());

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired invite code.');
    END IF;

    IF v_invite.use_count >= v_invite.max_uses THEN
      RETURN jsonb_build_object('success', false, 'message', 'Invite code usage limit exceeded.');
    END IF;

    UPDATE public.profiles
    SET role = 'admin',
        updated_at = now()
    WHERE id = v_user_id;

    UPDATE public.admin_invites
    SET use_count = use_count + 1,
        accepted_by = v_user_id,
        status = CASE WHEN use_count + 1 >= max_uses THEN 'used' ELSE 'active' END
    WHERE id = v_invite.id;

    RETURN jsonb_build_object('success', true, 'message', 'Promoted to Admin successfully!');
  END;
  $$;

  -- 8. ENABLE ROW LEVEL SECURITY (RLS)
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.event_codes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.event_members ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.collection_media ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

  -- PROFILES POLICIES
  CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
  CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((SELECT auth.uid()) = id);
  CREATE POLICY "Super admin full access on profiles" ON public.profiles FOR ALL USING (public.is_super_admin());

  -- EVENTS POLICIES
  CREATE POLICY "Anyone can view active events" ON public.events FOR SELECT USING (status = 'active' OR public.is_admin());
  CREATE POLICY "Super admin manage events" ON public.events FOR ALL USING (public.is_super_admin());
  CREATE POLICY "Assigned admin can update events" ON public.events FOR UPDATE USING (public.is_event_admin(id));

  -- EVENT ADMINS POLICIES
  CREATE POLICY "Admins can view event assignments" ON public.event_admins FOR SELECT USING (public.is_admin());
  CREATE POLICY "Super admin manage event admins" ON public.event_admins FOR ALL USING (public.is_super_admin());

  -- EVENT CODES POLICIES
  CREATE POLICY "Admins can view event codes" ON public.event_codes FOR SELECT USING (public.is_event_admin(event_id));
  CREATE POLICY "Admins can manage event codes" ON public.event_codes FOR ALL USING (public.is_event_admin(event_id));

  -- EVENT MEMBERS POLICIES
  CREATE POLICY "Users can view own memberships" ON public.event_members FOR SELECT USING ((SELECT auth.uid()) = user_id OR public.is_event_admin(event_id));
  CREATE POLICY "Admins can manage event members" ON public.event_members FOR ALL USING (public.is_event_admin(event_id));

  -- COLLECTIONS POLICIES
  CREATE POLICY "Public collections read" ON public.collections FOR SELECT USING (visibility = 'public' OR public.is_admin());
  CREATE POLICY "Super admin manage collections" ON public.collections FOR ALL USING (public.is_super_admin());

  -- MEDIA POLICIES
  CREATE POLICY "Media read for members and admins" ON public.media FOR SELECT USING (
    event_id IS NULL OR public.is_event_member(event_id) OR public.is_super_admin()
  );
  CREATE POLICY "Admins can insert media for assigned events" ON public.media FOR INSERT WITH CHECK (
    event_id IS NOT NULL AND public.is_event_admin(event_id)
  );
  CREATE POLICY "Super admin full access on media" ON public.media FOR ALL USING (public.is_super_admin());

  -- COLLECTION MEDIA POLICIES
  CREATE POLICY "Anyone can read collection media" ON public.collection_media FOR SELECT USING (true);
  CREATE POLICY "Super admin manage collection media" ON public.collection_media FOR ALL USING (public.is_super_admin());

  -- ADMIN INVITES POLICIES
  CREATE POLICY "Admins can view admin invites" ON public.admin_invites FOR SELECT USING (public.is_admin());
  CREATE POLICY "Super admin manage admin invites" ON public.admin_invites FOR ALL USING (public.is_super_admin());

  -- AUDIT LOGS POLICIES
  CREATE POLICY "Super admin view audit logs" ON public.audit_logs FOR SELECT USING (public.is_super_admin());
  CREATE POLICY "System insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (true);

  -- 9. SEED INITIAL REAL DATA FOR PURUSHARTH STUDIO
  
  -- Insert 2 Showcase Events
  INSERT INTO public.events (id, title, description, event_date, location, cover_url, status, total_photos)
  VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    'The Royal Udaipur Wedding',
    'Opulent royal palace wedding in Udaipur at twilight with warm lanterns reflecting off Lake Pichola, editorial cinematic shot.',
    'Dec 18–21, 2025',
    'The Leela Palace & Lake Pichola, Udaipur',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB4fJCKovRnEtCFrj9j4TgWkUdjrduv9xTxC_HjIwp1AGHC7aeY-yvpjo9-7qYOtv7tTexzmH0g2vjyAAD6TXayaJ-kL0KXvg7Bq4_6Z-J4w0Z43oc4TzF2G4pS3u7acrKuPJmTbOA_ZehPMa-tcVttM1Y6txfPrtW0a6Y4B-DKrXblka-2OsBOk4FuEAsPHuMVqweMidloisEWyBcdidxJ5HUhQbun-_Qh7FyV9_L9wpTk8_uNE5s88A',
    'active',
    840
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Oberoi Heritage Gala 2024',
    'High society luxury black-tie gala dinner at The Oberoi New Delhi with chandeliers and champagne towers, editorial photography.',
    'Nov 28, 2025',
    'The Oberoi, New Delhi',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAui5Z6X6X0Dtbqv0EORKi4n6pXuRzf9iNYpqCgdp_O2RDwm2GBKlmjjs3tD2iSHgILCk4SOlcIBfzI4jBXzmbFRFU6m_DhA2Kz0HW2AWyySMvUw6-Z35aaI7n4LWf1wwCYqxVIyWC5URR-Ekm70vgGSw2S2b8rzUJhNB6ExbVdBtqAqtpYcELJ2bRAlAGYWLmh0bAe6-dN9_Uh8yHg1lHSSOktrG7Lle4JABLs2UaA8Ada9kJfDXI3bg',
    'active',
    520
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert Event Codes
  INSERT INTO public.event_codes (event_id, code, max_uses, use_count, status)
  VALUES 
  ('11111111-1111-1111-1111-111111111111', 'UDAIPUR-24', 1000, 14, 'active'),
  ('22222222-2222-2222-2222-222222222222', 'OBEROI-GL', 500, 8, 'active')
  ON CONFLICT (code) DO NOTHING;

  -- Insert Admin Invite Code
  INSERT INTO public.admin_invites (code, max_uses, use_count, status)
  VALUES ('INVITE-2025', 100, 2, 'active')
  ON CONFLICT (code) DO NOTHING;

  -- Insert Curated Collections
  INSERT INTO public.collections (id, title, description, cover_url, visibility)
  VALUES 
  (
    '33333333-3333-3333-3333-333333333333',
    'The Royal Udaipur Highlights',
    'Editorial master curation showcasing palace sunsets, royal mandap ceremonies, and intimate bride-groom portraits.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCoPERunyNFs2mA-cGRa5mCw9p1dqtggKkeTfkrttc1upZ1570HJfhBr9q9_gOF_5Vcill-jUMx26CVBQ2om5EyBk0hcpu6SkEF2biehvbU0q9WnGndxdIRjcS9b8NsS42CCJb3aal37NtNo3MEbtRZgz6WnWpekKV_JTFNbI4vlYUVQ5NsUtj6IDGEJGglLf6SK9OlgRaHGCpFj58RpotkC7Uk_538Y1Lx58s5IW_JJCnFTBnDyRJujA',
    'public'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Palace Twilight Cinema Still Lookbook',
    'Handcrafted 35mm film stills capturing the timeless romanticism of Indian regal festivities.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDJYhfEBD2-kcD4VLfXSu5dIrw_Savmz6FJbkyZJejCnU8Pem3w4jdSVSds9s_HjF1E8ZoOJX9ioNjfJLFKK9NIfy_wSKYNeVBvIxnX_yww7lquq_7DCzzoXP8Hf-yp3dEXjH2xvlXsJahD8KCV2JcCpwEutV4nzqzCUgpzXxRMPD1cAEvEV7mloDep-qDz8X1nm2Nsv3x4G0IjaGMvtYYuRFLdK9t-8L8d0Tv07Pa9Z7k0XE4RrBfaAFOlljDjWckStMo',
    'public'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert Sample Media for Events and Collections
  INSERT INTO public.media (id, event_id, object_key, url, media_type, mime_type, title, status)
  VALUES
  (
    '55555555-5555-5555-5555-555555555551',
    '11111111-1111-1111-1111-111111111111',
    'events/udaipur/udaipur-01.jpg',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB4fJCKovRnEtCFrj9j4TgWkUdjrduv9xTxC_HjIwp1AGHC7aeY-yvpjo9-7qYOtv7tTexzmH0g2vjyAAD6TXayaJ-kL0KXvg7Bq4_6Z-J4w0Z43oc4TzF2G4pS3u7acrKuPJmTbOA_ZehPMa-tcVttM1Y6txfPrtW0a6Y4B-DKrXblka-2OsBOk4FuEAsPHuMVqweMidloisEWyBcdidxJ5HUhQbun-_Qh7FyV9_L9wpTk8_uNE5s88A',
    'photo',
    'image/jpeg',
    'Palace Courtyard Arrival',
    'ready'
  ),
  (
    '55555555-5555-5555-5555-555555555552',
    '11111111-1111-1111-1111-111111111111',
    'events/udaipur/udaipur-02.jpg',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCoPERunyNFs2mA-cGRa5mCw9p1dqtggKkeTfkrttc1upZ1570HJfhBr9q9_gOF_5Vcill-jUMx26CVBQ2om5EyBk0hcpu6SkEF2biehvbU0q9WnGndxdIRjcS9b8NsS42CCJb3aal37NtNo3MEbtRZgz6WnWpekKV_JTFNbI4vlYUVQ5NsUtj6IDGEJGglLf6SK9OlgRaHGCpFj58RpotkC7Uk_538Y1Lx58s5IW_JJCnFTBnDyRJujA',
    'photo',
    'image/jpeg',
    'Golden Hour Lake Terrace',
    'ready'
  ),
  (
    '55555555-5555-5555-5555-555555555553',
    '22222222-2222-2222-2222-222222222222',
    'events/oberoi/oberoi-01.jpg',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAui5Z6X6X0Dtbqv0EORKi4n6pXuRzf9iNYpqCgdp_O2RDwm2GBKlmjjs3tD2iSHgILCk4SOlcIBfzI4jBXzmbFRFU6m_DhA2Kz0HW2AWyySMvUw6-Z35aaI7n4LWf1wwCYqxVIyWC5URR-Ekm70vgGSw2S2b8rzUJhNB6ExbVdBtqAqtpYcELJ2bRAlAGYWLmh0bAe6-dN9_Uh8yHg1lHSSOktrG7Lle4JABLs2UaA8Ada9kJfDXI3bg',
    'photo',
    'image/jpeg',
    'Grand Ballroom Gala Dinner',
    'ready'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.collection_media (collection_id, media_id, sort_order)
  VALUES 
  ('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555551', 1),
  ('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555552', 2),
  ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555553', 1)
  ON CONFLICT (collection_id, media_id) DO NOTHING;
  `;

  console.log('Running SQL migration script...');
  await client.query(sql);
  console.log('Migration executed successfully!');

  const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;");
  console.log('Tables created in public schema:');
  console.table(tablesRes.rows);

  const eventsCount = await client.query('SELECT count(*) FROM public.events;');
  const codesCount = await client.query('SELECT count(*) FROM public.event_codes;');
  const collectionsCount = await client.query('SELECT count(*) FROM public.collections;');
  const mediaCount = await client.query('SELECT count(*) FROM public.media;');

  console.log({
    events: eventsCount.rows[0].count,
    codes: codesCount.rows[0].count,
    collections: collectionsCount.rows[0].count,
    media: mediaCount.rows[0].count
  });

  await client.end();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
