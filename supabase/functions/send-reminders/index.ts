import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import * as postgres from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

// Add Deno type declaration to resolve "Cannot find name 'Deno'" errors.
declare const Deno: any;

/*
-- ⚠️ SUPER IMPORTANT SETUP INSTRUCTIONS (UPDATED) ⚠️
--
-- The previous error "Name must not start with the SUPABASE_ prefix" was because Supabase
-- reserves secret names starting with "SUPABASE_". We've fixed this in the code.
--
-- Please follow these steps carefully in your Supabase dashboard to make the reminders work.
--
-- 1. RENAME THE DATABASE SECRET:
--    This is the most important fix.
--    - Go to your Supabase project -> Edge Functions -> "send-reminders" function -> "Secrets" tab.
--    - You should see a secret named `SUPABASE_DATABASE_URL`.
--    - Click on it to edit it.
--    - RENAME it from `SUPABASE_DATABASE_URL` to `DATABASE_CONNECTION_STRING`.
--    - The value (the long `postgresql://...` string with your password) stays the same.
--    - Save the change.
--
-- 2. VERIFY ONESIGNAL SECRETS:
--    In the same "Secrets" tab, make sure you have these two secrets (names must be exact):
--    - `ONESIGNAL_APP_ID`      -> Value: [Your OneSignal App ID]
--    - `ONESIGNAL_REST_API_KEY` -> Value: [Your OneSignal REST API Key]
--
-- 3. VERIFY DATABASE FUNCTION:
--    Run this code ONCE in your Supabase SQL Editor if you haven't already.
--    (The SQL code block is provided below).
--
-- 4. VERIFY CRON JOB:
--    - Go to Database -> "Cron Jobs".
--    - Check that your job runs every minute (`* * * * *`) and calls this "send-reminders" function via POST.
--
-- PASTE THIS SQL CODE INTO THE SUPABASE SQL EDITOR AND RUN IT ONCE (if you haven't):
*/
/*
CREATE OR REPLACE FUNCTION get_pending_reminders(from_time timestamptz, to_time timestamptz)
RETURNS TABLE (
    id bigint,
    text text,
    user_id uuid
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.text,
        t.user_id
    FROM
        public.todos t
    WHERE
        t.completed = FALSE
        AND t.notification_sent = FALSE
        AND t.reminder_offset IS NOT NULL
        AND t.reminder_offset > 0
        AND t.start_time IS NOT NULL
        AND t.due_date IS NOT NULL
        AND (
            (t.due_date::timestamp AT TIME ZONE 'UTC') +
            (t.start_time::time) -
            (t.reminder_offset * interval '1 minute')
        ) BETWEEN from_time AND to_time;
END;
$$ LANGUAGE plpgsql;
*/

// --- Get configuration from environment variables ---
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');
// FIX: Changed secret name to avoid Supabase prefix restriction. The user must rename this in the Supabase dashboard.
const DATABASE_URL = Deno.env.get('DATABASE_CONNECTION_STRING');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a connection pool for the database
const pool = new postgres.Pool(DATABASE_URL, 3, true);

serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!DATABASE_URL || !ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("Missing required environment variables (DATABASE_CONNECTION_STRING, ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY)");
    }
    
    // Get a client from the connection pool
    const connection = await pool.connect();

    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      // 1. Call the database function to get pending reminders
      const result = await connection.queryObject< { id: number; text: string; user_id: string } >(
        "SELECT id, text, user_id FROM get_pending_reminders($1, $2)",
        [fiveMinutesAgo.toISOString(), now.toISOString()]
      );
      const reminders = result.rows;

      if (!reminders || reminders.length === 0) {
        return new Response(JSON.stringify({ message: "No reminders to send." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // 2. Prepare and send notifications to OneSignal
      const notificationPromises = reminders.map((reminder) => {
        const notification = {
          app_id: ONESIGNAL_APP_ID,
          include_external_user_ids: [reminder.user_id],
          channel_for_external_user_ids: "push",
          headings: { "es": "¡Recordatorio de Tarea!" },
          subtitle: { "es": "Tu pollito te recuerda:" },
          contents: { "es": reminder.text },
          large_icon: 'https://pbtdzkpympdfemnejpwj.supabase.co/storage/v1/object/public/Sonido-ambiente/pollito_icon.png',
          language: "es"
        };

        return fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
          },
          body: JSON.stringify(notification),
        });
      });

      const results = await Promise.all(notificationPromises);
      results.forEach(async (response, index) => {
          if (!response.ok) {
              console.error(`OneSignal API error for user ${reminders[index].user_id}:`, await response.text());
          }
      });
      
      // 3. Mark reminders as sent in the database
      const reminderIds = reminders.map(r => r.id);
      await connection.queryObject(
        "UPDATE public.todos SET notification_sent = TRUE WHERE id = ANY($1::bigint[])",
        [reminderIds]
      );
      
      return new Response(JSON.stringify({ message: `Successfully processed ${reminders.length} reminders.` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } finally {
      // Release the client back to the pool
      connection.release();
    }
  } catch (err) {
    console.error('Error in function execution:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});