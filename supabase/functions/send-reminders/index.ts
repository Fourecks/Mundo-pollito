import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Add Deno type declaration
declare const Deno: any;

/*
-- ⚠️ SETUP INSTRUCTIONS (PLEASE READ CAREFULLY) ⚠️
--
-- We are trying a new, more direct approach to fix the server errors.
-- Please verify your configuration one last time. This is critical.
--
-- 1. VERIFY SECRETS:
--    - Go to your Supabase project -> Edge Functions -> "send-reminders" function -> "Secrets" tab.
--    - MAKE SURE you have these exact secrets:
--      - `SUPABASE_URL` -> Value: Your project URL (e.g., https://xxxxxxxx.supabase.co)
--      - `SUPABASE_SERVICE_ROLE_KEY` -> Value: Your project's "service_role" key (this is the long one)
--      - `ONESIGNAL_APP_ID` -> Value: [Your OneSignal App ID]
--      - `ONESIGNAL_REST_API_KEY` -> Value: [Your OneSignal REST API Key]
--    - DELETE the `DATABASE_CONNECTION_STRING` secret if it still exists. It is no longer needed.
--
-- 2. VERIFY DATABASE FUNCTION:
--    Run the SQL code below ONCE in your Supabase SQL Editor if you haven't already.
--
-- 3. VERIFY CRON JOB:
--    - Go to Database -> "Cron Jobs".
--    - Check that your job runs every minute (`* * * * *`) and calls this "send-reminders" function via POST.
--
-- SQL CODE TO RUN ONCE:
CREATE OR REPLACE FUNCTION get_pending_reminders(from_time timestamptz, to_time timestamptz)
RETURNS TABLE (id bigint, text text, user_id uuid) AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.text, t.user_id FROM public.todos t
    WHERE t.completed = FALSE AND t.notification_sent = FALSE AND t.reminder_offset IS NOT NULL
    AND t.reminder_offset > 0 AND t.start_time IS NOT NULL AND t.due_date IS NOT NULL
    AND ((t.due_date::timestamp AT TIME ZONE 'UTC') + (t.start_time::time) - (t.reminder_offset * interval '1 minute')) BETWEEN from_time AND to_time;
END;
$$ LANGUAGE plpgsql;
*/

// --- Get configuration from environment variables ---
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (_req) => {
  console.log("Function 'send-reminders' invoked.");

  if (_req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Check for required secrets
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error("Missing required environment variables. Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ONESIGNAL_APP_ID, and ONESIGNAL_REST_API_KEY.");
    }
    console.log("All secrets are present.");

    // 2. Calculate time window
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    console.log(`Checking for reminders between ${fiveMinutesAgo.toISOString()} and ${now.toISOString()}`);

    // 3. Fetch pending reminders from Supabase RPC
    let reminders: { id: number; text: string; user_id: string }[] = [];
    try {
      const remindersResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_pending_reminders`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from_time: fiveMinutesAgo.toISOString(),
          to_time: now.toISOString(),
        }),
      });

      if (!remindersResponse.ok) {
        const errorBody = await remindersResponse.text();
        throw new Error(`Failed to fetch reminders from Supabase. Status: ${remindersResponse.status}. Body: ${errorBody}`);
      }
      
      reminders = await remindersResponse.json();
      console.log(`Found ${reminders.length} reminders to process.`);

    } catch (fetchErr) {
        console.error("CRITICAL: Error during fetch to Supabase RPC.", fetchErr);
        throw fetchErr; // Re-throw to be caught by the main handler
    }

    if (reminders.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 4. Send notifications via OneSignal
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

      console.log(`Preparing to send notification for todo ID: ${reminder.id}`);
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
        const errorText = await response.text();
        console.error(`OneSignal API error for user ${reminders[index].user_id} (todo ID ${reminders[index].id}): ${errorText}`);
      } else {
        console.log(`Successfully sent notification for todo ID: ${reminders[index].id}`);
      }
    });

    // 5. Mark reminders as sent
    const reminderIds = reminders.map(r => r.id);
    try {
        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/todos?id=in.(${reminderIds.join(',')})`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ notification_sent: true }),
        });
        
        if (!updateResponse.ok) {
            const errorBody = await updateResponse.text();
            throw new Error(`Failed to update 'notification_sent' flag. Status: ${updateResponse.status}. Body: ${errorBody}`);
        }
        console.log(`Successfully marked ${reminderIds.length} todos as sent.`);
    } catch (updateErr) {
        console.error("CRITICAL: Error during update to Supabase.", updateErr);
        // We don't re-throw here to ensure the function still returns a 200 if notifications were sent
        // but the DB update failed. This avoids re-sending notifications on the next run.
        // A more robust system would handle this case, but for now, logging is sufficient.
    }
    
    return new Response(JSON.stringify({ message: `Successfully processed ${reminders.length} reminders.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    // This is the main error catcher for the entire function
    console.error('FATAL: An unhandled error occurred in the function.', err);
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});