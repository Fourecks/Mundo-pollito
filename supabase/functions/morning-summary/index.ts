
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { sendNotification } from '../_shared/onesignal.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Cron jobs run in UTC. This gets the current date in UTC.
    const todayKey = new Date().toISOString().split('T')[0];

    // Fetch all pending todos for today.
    const { data: todos, error } = await supabaseAdmin
      .from('todos')
      .select('user_id')
      .eq('due_date', todayKey)
      .eq('completed', false);

    if (error) throw error;

    if (!todos || todos.length === 0) {
      return new Response(JSON.stringify({ message: `No pending tasks for today across all users.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Group tasks by user to count them.
    const tasksPerUser = todos.reduce((acc, todo) => {
      if(todo.user_id) {
        acc[todo.user_id] = (acc[todo.user_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Create a notification promise for each user who has tasks today.
    const notificationPromises = Object.entries(tasksPerUser).map(([userId, taskCount]) =>
      sendNotification({
        userIds: [userId],
        title: '¡Pollito Madrugador! ☀️',
        // FIX: Explicitly cast `taskCount` to a number to resolve a TypeScript type error.
        body: `¡Buenos días, pollito! Hoy tienes ${taskCount} tarea${Number(taskCount) > 1 ? 's' : ''} en tu agenda. ¡Vamos a por un día súper productivo!`,
      })
    );

    await Promise.all(notificationPromises);

    return new Response(JSON.stringify({ success: true, usersNotified: notificationPromises.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error in morning-summary cron function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
