import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// FIX: Add Deno type declaration to resolve "Cannot find name 'Deno'" errors.
// This is for local type-checking; the Deno runtime provides this global.
declare const Deno: any;

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` } } }
    );

    const now = new Date();
    // Check for tasks where the reminder time is within the last 5 minutes
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const { data: reminders, error } = await supabaseAdmin.rpc('get_pending_reminders', {
        from_time: fiveMinutesAgo.toISOString(),
        to_time: now.toISOString()
    });

    if (error) {
      console.error('Error fetching reminders:', error);
      throw error;
    }

    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const notifications = reminders.map((reminder: any) => ({
      app_id: ONESIGNAL_APP_ID,
      include_external_user_ids: [reminder.user_id],
      channel_for_external_user_ids: "push",
      headings: { "es": "¡Recordatorio de Tarea!" },
      subtitle: { "es": "Tu pollito te recuerda:" },
      contents: { "es": reminder.text },
      small_icon: 'ic_stat_onesignal_default',
      // You can add a custom icon URL here
      // large_icon: 'https://pbtdzkpympdfemnejpwj.supabase.co/storage/v1/object/public/Sonido-ambiente/pollito_icon.png',
      language: "es"
    }));

    // Send all notifications
    for (const notification of notifications) {
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify(notification),
        });

        if (!response.ok) {
            console.error(`OneSignal API error for user ${notification.include_external_user_ids[0]}:`, await response.text());
        }
    }
    
    // Mark reminders as sent
    const reminderIds = reminders.map((r: any) => r.id);
    const { error: updateError } = await supabaseAdmin
      .from('todos')
      .update({ notification_sent: true })
      .in('id', reminderIds);

    if (updateError) {
      console.error('Error updating notification_sent status:', updateError);
    }

    return new Response(JSON.stringify({ message: `Successfully processed ${notifications.length} reminders.` }), {
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

/*
-- Run this SQL in your Supabase SQL Editor to create the required database function
-- This function calculates the exact time a notification should be sent and allows
-- the Edge Function to query for it efficiently.

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
