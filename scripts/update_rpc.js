const { Client } = require('pg');

async function updateDb() {
  const client = new Client({
    connectionString: 'postgres://postgres:kBVdg1XBzRbpEN8G@db.jddzvxctbrqtpodscnnp.supabase.co:5432/postgres'
  });

  await client.connect();
  console.log('Connected to Postgres.');

  const sql = `
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

      IF v_user_id IS NOT NULL THEN
        INSERT INTO public.event_members (event_id, user_id, source_code_id, status)
        VALUES (v_event_code.event_id, v_user_id, v_event_code.id, 'active')
        ON CONFLICT (event_id, user_id) DO NOTHING;
      END IF;

      UPDATE public.event_codes
      SET use_count = use_count + 1
      WHERE id = v_event_code.id;

      RETURN jsonb_build_object(
        'success', true,
        'message', 'Event access granted!',
        'event_id', v_event.id,
        'title', v_event.title,
        'description', v_event.description,
        'event_date', v_event.event_date,
        'location', v_event.location,
        'total_photos', v_event.total_photos,
        'cover_url', v_event.cover_url
      );
    END;
    $$;

    DROP POLICY IF EXISTS "Public media read for ready assets" ON public.media;
    CREATE POLICY "Public media read for ready assets" ON public.media
    FOR SELECT USING (status = 'ready');

    DROP POLICY IF EXISTS "Anyone can validate event codes" ON public.event_codes;
    CREATE POLICY "Anyone can validate event codes" ON public.event_codes
    FOR SELECT USING (status = 'active');
  `;

  await client.query(sql);
  console.log('Successfully updated join_event_by_code RPC and media read policy!');

  // Test the RPC
  const res = await client.query("SELECT public.join_event_by_code('UDAIPUR-24') as result;");
  console.log('join_event_by_code test:', res.rows[0].result);

  await client.end();
}

updateDb().catch(console.error);
