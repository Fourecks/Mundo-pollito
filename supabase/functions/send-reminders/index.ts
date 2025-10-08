// Import Deno's standard server and createClient from Supabase
declare const Deno: any;
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

// CORS headers for preflight requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get OneSignal credentials from Supabase secrets
    // IMPORTANT: You must set these in your Supabase project's Edge Function settings
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      throw new Error('OneSignal App ID or REST API Key are not set in Supabase secrets.');
    }

    // Create an admin Supabase client to access database
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Find tasks that are due for a reminder in the next minute
    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
    const todayDateString = now.toISOString().split('T')[0];

    const { data: todos, error: todosError } = await supabaseAdmin
      .from('todos')
      .select('id, text, user_id, due_date, start_time, reminder_offset')
      .eq('due_date', todayDateString)
      .eq('completed', false)
      .eq('notification_sent', false)
      .gt('reminder_offset', 0)
      .neq('start_time', null);

    if (todosError) throw todosError;

    const notificationsToSend = [];
    const sentTodoIds = new Set();

    for (const todo of todos) {
      const startTime = new Date(`${todo.due_date}T${todo.start_time}`);
      const reminderTime = new Date(startTime.getTime() - (todo.reminder_offset || 0) * 60 * 1000);

      // Check if the reminder time is within the current minute
      if (reminderTime >= now && reminderTime < oneMinuteFromNow) {
        
        // Prepare the notification payload for OneSignal
        const notification = {
          app_id: ONESIGNAL_APP_ID,
          include_external_user_ids: [todo.user_id], // Target the user by their Supabase ID
          headings: { en: 'Recordatorio de Tarea' },
          contents: { en: `¡Es hora de empezar: "${todo.text}"!` },
          // You can add more options like sounds, badges, etc.
          // web_url: 'https://your-app-url.com' // Optional: URL to open on click
        };
        
        notificationsToSend.push(
          fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
            },
            body: JSON.stringify(notification),
          })
        );
        sentTodoIds.add(todo.id);
      }
    }

    if (notificationsToSend.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Send all notifications in parallel
    await Promise.all(notificationsToSend);

    // Mark todos as having had their notification sent
    if (sentTodoIds.size > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('todos')
        .update({ notification_sent: true })
        .in('id', Array.from(sentTodoIds));
      if (updateError) throw updateError;
    }

    return new Response(JSON.stringify({ message: `Sent ${notificationsToSend.length} reminders.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ error: err.message }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
    });
  }
});