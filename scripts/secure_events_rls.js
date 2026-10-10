const { Client } = require('pg');

async function secureDatabase() {
  const client = new Client({
    connectionString: 'postgres://postgres:kBVdg1XBzRbpEN8G@db.jddzvxctbrqtpodscnnp.supabase.co:5432/postgres'
  });

  await client.connect();
  console.log('Connected to Postgres.');

  const sql = `
    -- 1. Events SELECT policy:
    -- Admin or Superadmin can view all events.
    -- Clients can ONLY view events they have unlocked (is_event_member).
    DROP POLICY IF EXISTS "Members and admins can view events" ON public.events;
    CREATE POLICY "Members and admins can view events"
    ON public.events
    FOR SELECT
    TO authenticated, anon
    USING (
      is_event_member(id)
      OR is_admin()
      OR is_super_admin()
      OR ((SELECT auth.uid()) = created_by)
    );

    -- 2. Media SELECT policy:
    -- Admin or Superadmin can view all media.
    -- Clients can ONLY view media for events they have unlocked (is_event_member).
    -- Public media without event_id can be viewed by all.
    DROP POLICY IF EXISTS "Members and admins can view media" ON public.media;
    CREATE POLICY "Members and admins can view media"
    ON public.media
    FOR SELECT
    TO authenticated, anon
    USING (
      (deleted_at IS NULL) AND (
        event_id IS NULL
        OR is_event_member(event_id)
        OR is_admin()
        OR is_super_admin()
      )
    );

    -- 3. Media INSERT policy:
    -- Admins and superadmins can insert media for events.
    DROP POLICY IF EXISTS "Admins can insert media for assigned events" ON public.media;
    DROP POLICY IF EXISTS "Authenticated users can insert media" ON public.media;
    DROP POLICY IF EXISTS "Anon can insert media" ON public.media;
    CREATE POLICY "Admins and members can insert media"
    ON public.media
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);
  `;

  await client.query(sql);
  console.log('Successfully updated RLS policies with admin and super_admin access!');

  await client.end();
}

secureDatabase().catch(console.error);
