// supabase/functions/morning-summary/index.ts

// ⚠️ DEPLOYMENT INSTRUCTION
// Deploy this function with the `--no-verify-jwt` flag to allow cron job execution.
// supabase functions deploy morning-summary --no-verify-jwt
//
// ⏰ SCHEDULING INSTRUCTION
// To run this at 5:30 AM in a timezone like CST (UTC-6 during DST), schedule it for 11:30 UTC.
// Cron Expression: 30 11 * * *

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { sendOneSignalNotification } from '../_shared/onesignal.ts';

interface Todo {
  user_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch all incomplete tasks scheduled for today.
    const { data: todos, error: fetchError } = await supabaseAdmin
      .from('todos')
      .select('user_id')
      .eq('completed', false)
      .eq('due_date', today);

    if (fetchError) {
      throw fetchError;
    }
    
    if (!todos || todos.length === 0) {
      return new Response(JSON.stringify({ message: "No tasks for today, no summaries sent." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Group tasks by user_id and count them.
    const tasksByUser = todos.reduce((acc: Record<string, number>, todo: Todo) => {
      acc[todo.user_id] = (acc[todo.user_id] || 0) + 1;
      return acc;
    }, {});

    // 3. Send a notification to each user.
    const notificationPromises = Object.entries(tasksByUser).map(([userId, taskCount]) => {
      const title = 'Tu resumen mañanero ☀️';
      const message = `¡Pío, pío! Hoy tienes ${taskCount} ${taskCount === 1 ? 'tarea' : 'tareas'} en tu lista. ¡Que tengas un día muy productivo!`;
      
      return sendOneSignalNotification(userId, title, message);
    });

    await Promise.all(notificationPromises);
    
    return new Response(JSON.stringify({ message: `Sent morning summaries to ${Object.keys(tasksByUser).length} users.` }), {
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
