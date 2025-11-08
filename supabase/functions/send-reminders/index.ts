// supabase/functions/send-reminders/index.ts

// ⚠️ DEPLOYMENT INSTRUCTION
// This function is triggered by a cron job and runs without a user context.
// By default, Supabase functions require user authentication (a JWT), which causes a 401 Unauthorized error for cron jobs.
// To fix this, you MUST deploy this function with the `--no-verify-jwt` flag.
//
// Run this command in your terminal:
// supabase functions deploy send-reminders --no-verify-jwt
//
// This tells Supabase to allow this specific function to be executed by the cron scheduler.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { sendOneSignalNotification } from '../_shared/onesignal.ts';

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
      .select('id, user_id, text, due_date, start_time, reminder_offset, timezone_offset')
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
      // Calculate the exact reminder time, accounting for the user's timezone.
      const [year, month, day] = todo.due_date.split('-').map(Number);
      const [hour, minute] = todo.start_time.split(':').map(Number);
      
      // Create a date object as if the local time parts were UTC
      const localTimeAsUTC = new Date(Date.UTC(year, month - 1, day, hour, minute));
      
      // Get the user's timezone offset (in minutes) from when they saved the task.
      // getTimezoneOffset() is positive for timezones behind UTC (e.g., Americas).
      // We need to ADD this offset to our wrongly interpreted UTC time to get the correct UTC time.
      const userOffsetMinutes = todo.timezone_offset || 0;
      const startTime = new Date(localTimeAsUTC.getTime() + userOffsetMinutes * 60 * 1000);
      
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
        "Pollito te recuerda 🐥:",
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