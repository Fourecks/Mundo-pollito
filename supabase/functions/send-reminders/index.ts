import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

// FIX: Add Deno type declaration to resolve "Cannot find name 'Deno'" errors.
// This is for local type-checking; the Deno runtime provides this global.
declare const Deno: any;

/*
-- ⚠️ IMPORTANT SETUP INSTRUCTIONS FOR NOTIFICATIONS ⚠️
--
-- For reminders to work, three things must be configured in your Supabase project:
--
-- 1. CREATE THE DATABASE FUNCTION:
--    The code below needs to be run ONCE in your Supabase SQL Editor.
--    Go to your Supabase project -> SQL Editor -> "New query" -> Paste the code -> Click "RUN".
--    This function allows the server to efficiently find which reminders to send.
--
-- 2. SET ENVIRONMENT VARIABLES (SECRETS):
--    This function needs your OneSignal keys to send notifications.
--    Go to your Supabase project -> Edge Functions -> "send-reminders" -> Click on it -> Go to the "Secrets" tab.
--    Create two secrets:
--    - Name: ONESIGNAL_APP_ID      -> Value: [Your OneSignal App ID from the OneSignal dashboard]
--    - Name: ONESIGNAL_REST_API_KEY -> Value: [Your OneSignal REST API Key from the OneSignal dashboard]
--
-- 3. SCHEDULE THE FUNCTION TO RUN (CRON JOB):
--    This function needs to be triggered automatically every minute to check for reminders.
--    Go to your Supabase project -> Database -> "Cron Jobs".
--    Create a new job with this configuration:
--    - Schedule: * * * * *  (this means "run every minute")
--    - Function: Choose "send-reminders" from the dropdown.
--
-- NOTE ON TIMEZONES: This setup assumes the task time is entered in UTC. For simplicity, it doesn't handle user-specific timezones.
--
-- PASTE THIS CODE INTO THE SUPABASE SQL EDITOR AND RUN IT:
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

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const now = new Date();
    // Check for tasks where the reminder time is within the last 5 minutes to be safe
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // 1. Fetch pending reminders using Supabase REST API for RPC
    const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_pending_reminders`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from_time: fiveMinutesAgo.toISOString(),
        to_time: now.toISOString(),
      }),
    });

    if (!rpcResponse.ok) {
      const errorBody = await rpcResponse.text();
      console.error('Error fetching reminders via RPC:', errorBody);
      throw new Error(`Failed to fetch reminders: ${rpcResponse.status} ${rpcResponse.statusText}`);
    }

    const reminders: { id: number; text: string; user_id: string }[] = await rpcResponse.json();

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
    
    // 3. Mark reminders as sent in Supabase using REST API
    const reminderIds = reminders.map((r) => r.id);
    const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/todos?id=in.(${reminderIds.join(',')})`, {
        method: 'PATCH',
        headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ notification_sent: true }),
    });

    if (!updateResponse.ok) {
      const errorBody = await updateResponse.text();
      console.error('Error updating notification_sent status:', errorBody);
      // We don't throw here, as the notifications may have been sent.
    }

    return new Response(JSON.stringify({ message: `Successfully processed ${reminders.length} reminders.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error('Unhandled error in function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
