
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { sendNotification } from '../_shared/onesignal.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: completedTodos, error } = await supabaseAdmin
      .from('todos')
      .select('user_id')
      .eq('completed', true)
      .gte('updated_at', sevenDaysAgo); // Use updated_at for more accurate completion time
    
    if (error) throw error;

    if (!completedTodos || completedTodos.length === 0) {
        return new Response(JSON.stringify({ message: 'No completed tasks in the last week.' }), {
             headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const tasksPerUser = completedTodos.reduce((acc, todo) => {
      if(todo.user_id) {
        acc[todo.user_id] = (acc[todo.user_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const promises = Object.entries(tasksPerUser).map(([userId, taskCount]) =>
      sendNotification({
        userIds: [userId],
        title: 'Resumen Semanal de Logros 🏆',
        // FIX: Explicitly cast `taskCount` to a number to resolve a TypeScript type error.
        body: `¡Felicidades! Esta semana has completado ${taskCount} tarea${Number(taskCount) > 1 ? 's' : ''}. ¡Tómate un momento para ver todo lo que has logrado!`,
      })
    );

    await Promise.all(promises);

    return new Response(JSON.stringify({ success: true, usersNotified: promises.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (err) {
    console.error('Error in weekly-summary cron function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
