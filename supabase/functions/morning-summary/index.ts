// supabase/functions/morning-summary/index.ts

// ⚠️ DEPLOYMENT INSTRUCTION
// 1. Deploy this function with the `--no-verify-jwt` flag to allow cron job execution.
//    supabase functions deploy morning-summary --no-verify-jwt
// 2. Schedule a cron job in your Supabase dashboard (Project -> Database -> Cron Jobs) to run every hour at the 30-minute mark.
//    Schedule: 30 * * * *
//    Function: morning-summary

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { sendOneSignalNotification } from '../_shared/onesignal.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const now = new Date();
    const currentUTCHour = now.getUTCHours();
    
    // This function is scheduled for HH:30 UTC. We target users at 5:30 AM local time.
    // local_time = utc_time - offset => 5.5 = (currentUTCHour + 0.5) - offset_hours
    // offset_hours = currentUTCHour - 5
    // The offset from getTimezoneOffset() is the opposite sign of what's intuitive.
    // e.g., PST is UTC-8, but getTimezoneOffset() returns 480.
    // The cron runs at HH:30, so it's `currentUTCHour + 0.5`.
    // user_local_hour = (currentUTCHour + 0.5) - (user_offset_minutes / 60)
    // We want user_local_hour to be 5.5.
    // 5.5 = (currentUTCHour + 0.5) - (user_offset_minutes / 60)
    // user_offset_minutes / 60 = currentUTCHour - 5
    // user_offset_minutes = (currentUTCHour - 5) * 60
    const targetOffsetMinutes = (currentUTCHour - 5) * 60;

    // 1. Get profiles for users in the target timezone.
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('timezone_offset', targetOffsetMinutes);

    if (profileError) {
      console.error("Error fetching profiles by timezone. Does 'timezone_offset' column exist in 'profiles' table?", profileError);
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: `No users in the target timezone (offset: ${targetOffsetMinutes}).` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const usersToNotify = profiles.map(p => p.id);

    // 2. Get today's date string for this timezone group
    const userLocalTime = new Date(now.getTime() - targetOffsetMinutes * 60 * 1000);
    const dateKey = userLocalTime.toISOString().split('T')[0];

    // 3. Fetch all uncompleted todos for these users for their "today"
    const { data: todos, error: todayTodosError } = await supabaseAdmin
      .from('todos')
      .select('user_id, text')
      .in('user_id', usersToNotify)
      .eq('due_date', dateKey)
      .eq('completed', false);

    if (todayTodosError) throw todayTodosError;
    if (!todos || todos.length === 0) {
        return new Response(JSON.stringify({ message: "No tasks found for today for the targeted users." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 4. Group todos by user
    const todosByUser = todos.reduce((acc, todo) => {
        if (!acc[todo.user_id]) acc[todo.user_id] = [];
        acc[todo.user_id].push(todo.text);
        return acc;
    }, {} as Record<string, string[]>);
    
    // 5. Format and send notifications
    const notificationPromises = Object.entries(todosByUser).map(([userId, tasks]: [string, string[]]) => {
        const taskCount = tasks.length;
        if (taskCount === 0) return Promise.resolve(true);
        
        const title = "Tu resumen de hoy ☀️";
        let message = `¡Pío, pío! Tienes ${taskCount} tarea${taskCount > 1 ? 's' : ''} para hoy:`;
        
        const tasksToList = tasks.slice(0, 3);
        message += tasksToList.map(taskText => `\n- ${taskText}`).join('');
        
        if (taskCount > 3) {
            message += `\n...y ${taskCount - 3} más.`;
        }
        
        return sendOneSignalNotification(userId, title, message);
    });
    
    await Promise.all(notificationPromises);

    return new Response(JSON.stringify({ message: `Sent morning summaries to ${Object.keys(todosByUser).length} users.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error("Error in morning-summary function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});