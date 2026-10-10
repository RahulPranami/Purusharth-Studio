const { Client } = require('pg');

async function secureDatabase() {
  const client = new Client({
    connectionString: 'postgres://postgres:kBVdg1XBzRbpEN8G@db.jddzvxctbrqtpodscnnp.supabase.co:5432/postgres'
  });

  await client.connect();
  console.log('Connected to Postgres.');

  const sql = `
    -- 1. Drop overly permissive policies on events
    DROP POLICY IF EXISTS "Anyone authenticated can view active events" ON public.events;
    DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;
    DROP POLICY IF EXISTS "Members and admins can view events" ON public.events;

    -- 2. Create strict select policy for events:
    -- Only members (who entered the code), assigned event admins, or super admins can view the event.
    CREATE POLICY "Members and admins can view events"
    ON public.events
    FOR SELECT
    TO authenticated, anon
    USING (
      is_event_member(id)
      OR is_super_admin()
      OR ((SELECT auth.uid()) = created_by)
    );

    -- 3. Drop overly permissive policies on media
    DROP POLICY IF EXISTS "Authenticated users can view non-deleted media" ON public.media;
    DROP POLICY IF EXISTS "Public media read for ready assets" ON public.media;
    DROP POLICY IF EXISTS "Media read for members and admins" ON public.media;
    DROP POLICY IF EXISTS "Members and admins can view media" ON public.media;

    -- 4. Create strict media read policy:
    -- event_id IS NULL: Public portfolio/collection assets (curated lookbooks)
    -- event_id IS NOT NULL: Private event photos, accessible ONLY by members who unlocked the event or admins
    CREATE POLICY "Members and admins can view media"
    ON public.media
    FOR SELECT
    TO authenticated, anon
    USING (
      (deleted_at IS NULL) AND (
        event_id IS NULL
        OR is_event_member(event_id)
        OR is_super_admin()
      )
    );

    -- 5. Secure event_codes so users cannot scrape codes
    DROP POLICY IF EXISTS "Anyone can validate event codes" ON public.event_codes;
    DROP POLICY IF EXISTS "Admins can view event codes" ON public.event_codes;
    CREATE POLICY "Admins can view event codes"
    ON public.event_codes
    FOR SELECT
    TO authenticated
    USING (
      is_admin()
      OR ((SELECT auth.uid()) = created_by)
    );
  `;

  await client.query(sql);
  console.log('Successfully secured RLS policies on events, media, and event_codes!');

  // Verify current policies on events and media
  const res = await client.query(`
    SELECT tablename, policyname, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('events', 'media', 'event_codes');
  `);
  console.log('Active policies:', res.rows);

  await client.end();
}

secureDatabase().catch(console.error);
