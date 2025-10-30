// supabase/functions/send-reminders/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: any;

// Supabase admin client to access all data
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Helper function to call OneSignal API
async function sendOneSignalNotification(userId: string, title: string, message: string) {
  const ONE_SIGNAL_APP_ID = Deno.env.get('ONE_SIGNAL_APP_ID');
  const ONE_SIGNAL_REST_API_KEY = Deno.env.get('ONE_SIGNAL_REST_API_KEY');

  if (!ONE_SIGNAL_APP_ID || !ONE_SIGNAL_REST_API_KEY) {
    console.error("OneSignal secrets are not set in environment variables.");
    return false; // Don't throw, just fail this one notification
  }
  
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONE_SIGNAL_REST_API_KEY}`
    },
    body: JSON.stringify({
      app_id: ONE_SIGNAL_APP_ID,
      include_external_user_ids: [userId],
      headings: { en: title },
      contents: { en: message },
      web_url: Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.onrender.com') || 'https://pollito-productivo.onrender.com',
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`OneSignal API Error for user ${userId}:`, errorData);
    return false;
  }
  
  return true;
}

serve(async (req) => {
  // This function is designed to be triggered by a cron job.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const now = new Date();
    
    // 1. Fetch all tasks that could potentially need a reminder.
    const { data: candidateTodos, error: fetchError } = await supabaseAdmin
      .from('todos')
      .select('id, user_id, text, due_date, start_time, reminder_offset')
      .eq('completed', false)
      .eq('notification_sent', false)
      .gt('reminder_offset', 0)
      .not('start_time', 'is', null)
      .not('due_date', 'is', null);

    if (fetchError) {
      throw fetchError;
    }

    const todosToSend: any[] = [];
    for (const todo of candidateTodos) {
      // Calculate the exact reminder time in UTC.
      const [year, month, day] = todo.due_date.split('-').map(Number);
      const [hour, minute] = todo.start_time.split(':').map(Number);
      
      const startTime = new Date(Date.UTC(year, month - 1, day, hour, minute));
      const reminderTime = new Date(startTime.getTime() - todo.reminder_offset * 60 * 1000);

      // Check if the reminder time is in the past.
      if (reminderTime <= now) {
        todosToSend.push(todo);
      }
    }
    
    if (todosToSend.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send at this time." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Send notifications and collect the IDs of tasks that were successfully notified.
    const sentTodoIds: number[] = [];
    const notificationPromises = todosToSend.map(async (todo) => {
      const success = await sendOneSignalNotification(
        todo.user_id,
        "Recordatorio de Tarea 🐥",
        `¡Es hora de empezar con "${todo.text}"!`
      );
      if (success) {
        sentTodoIds.push(todo.id);
      }
    });
    
    await Promise.all(notificationPromises);
    
    // 3. Update the `notification_sent` flag in the database for all sent reminders.
    if (sentTodoIds.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('todos')
        .update({ notification_sent: true })
        .in('id', sentTodoIds);
        
      if (updateError) {
        // This is a critical error to log as it might cause duplicate notifications.
        console.error("CRITICAL: Failed to update notification_sent flag for IDs:", sentTodoIds, updateError);
      }
    }
    
    return new Response(JSON.stringify({ message: `Successfully processed and sent ${sentTodoIds.length} reminders.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error("Error in send-reminders function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
