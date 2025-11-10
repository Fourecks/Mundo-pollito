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
    // Fetches tasks that have either an offset-based reminder OR an absolute time reminder.
    const { data: candidateTodos, error: fetchError } = await supabaseAdmin
      .from('todos')
      .select('id, user_id, text, due_date, start_time, reminder_offset, reminder_at')
      .eq('completed', false)
      .eq('notification_sent', false)
      .or('reminder_offset.gt.0,reminder_at.not.is.null');

    if (fetchError) {
      throw fetchError;
    }
    
    if (!candidateTodos || candidateTodos.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send at this time." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get unique user IDs and fetch their timezone offsets from profiles
    const userIds = [...new Set(candidateTodos.map(t => t.user_id))];
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, timezone_offset')
      .in('id', userIds);
      
    if (profileError) {
      console.error("Warning: Could not fetch user profiles for timezone data.", profileError.message);
    }
    
    const offsetMap = new Map(profiles?.map(p => [p.id, p.timezone_offset]));

    const todosToSend: any[] = [];
    for (const todo of candidateTodos) {
      let reminderTime: Date | null = null;
      const userOffsetMinutes = offsetMap.get(todo.user_id) || 0;
      
      // Priority 1: Absolute reminder time
      if (todo.reminder_at) {
          // The reminder_at is stored as "YYYY-MM-DDTHH:mm". We treat this as the user's local time.
          const [datePart, timePart] = todo.reminder_at.split('T');
          const [year, month, day] = datePart.split('-').map(Number);
          const [hour, minute] = timePart.split(':').map(Number);
          
          // Create a UTC date from parts, then adjust it to the real UTC time based on user's offset.
          const localTimeAsUTC = new Date(Date.UTC(year, month - 1, day, hour, minute));
          reminderTime = new Date(localTimeAsUTC.getTime() + Number(userOffsetMinutes) * 60 * 1000);
          
      // Priority 2: Offset-based reminder time
      } else if (todo.due_date && todo.start_time && todo.reminder_offset > 0) {
          const [year, month, day] = todo.due_date.split('-').map(Number);
          const [hour, minute] = todo.start_time.split(':').map(Number);
          
          const localTimeAsUTC = new Date(Date.UTC(year, month - 1, day, hour, minute));
          const startTime = new Date(localTimeAsUTC.getTime() + Number(userOffsetMinutes) * 60 * 1000);
          reminderTime = new Date(startTime.getTime() - Number(todo.reminder_offset) * 60 * 1000);
      }

      // Check if the calculated reminder time is in the past.
      if (reminderTime && reminderTime <= now) {
        todosToSend.push(todo);
      }
    }
    
    if (todosToSend.length === 0) {
      return new Response(JSON.stringify({ message: "No reminders to send at this time." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sentTodoIds: number[] = [];
    const notificationPromises = todosToSend.map(async (todo) => {
      const success = await sendOneSignalNotification(
        todo.user_id,
        "Recordatorio 🐥:",
        `${todo.text}`
      );
      if (success) {
        sentTodoIds.push(todo.id);
      }
    });
    
    await Promise.all(notificationPromises);
    
    if (sentTodoIds.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('todos')
        .update({ notification_sent: true })
        .in('id', sentTodoIds);
        
      if (updateError) {
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