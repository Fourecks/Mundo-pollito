// supabase/functions/morning-summary/index.ts

// ⚠️ INSTRUCCIONES DE DESPLIEGUE
// 1. Despliega esta función con el indicador `--no-verify-jwt` para permitir la ejecución por tarea programada (cron job).
//    supabase functions deploy morning-summary --no-verify-jwt
// 2. Asegúrate de que tu cron job en Supabase (Proyecto -> Database -> Cron Jobs) se ejecute cada hora.
//    Schedule: 30 * * * * (a los 30 minutos de cada hora)
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
    const nowUTC = new Date();

    // 1. Obtener todos los perfiles con una zona horaria y ui_settings configuradas.
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, timezone_offset, ui_settings')
      .not('timezone_offset', 'is', null)
      .not('ui_settings', 'is', null);

    if (profileError) {
      console.error("Error fetching profiles. Ensure 'ui_settings' and 'timezone_offset' columns exist.", profileError);
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: `No se encontraron perfiles con resumen diario activado.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const usersToNotify: string[] = [];

    // 2. Iterar sobre cada perfil para verificar si es la hora preferida del usuario.
    for (const profile of profiles) {
      // Safely access the nested property from the ui_settings JSONB column
      const preferredLocalHour = profile.ui_settings?.dailySummaryHour;
      
      // Skip this user if the setting is not a valid number (0 is a valid hour)
      if (typeof preferredLocalHour !== 'number') {
        continue;
      }
      
      const userOffsetMinutes = profile.timezone_offset;
      const userLocalTime = new Date(nowUTC.getTime() - userOffsetMinutes * 60 * 1000);
      
      // La función cron se ejecuta a HH:30 UTC. Usamos getUTCHours() en la hora local calculada
      // para evitar problemas con el horario de verano del servidor.
      if (userLocalTime.getUTCHours() === preferredLocalHour) {
        usersToNotify.push(profile.id);
      }
    }

    if (usersToNotify.length === 0) {
        return new Response(JSON.stringify({ message: "No hay usuarios para notificar en esta hora." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 3. Obtener la fecha de "hoy" para los usuarios a notificar.
    // (Todos tienen la misma fecha local, así que podemos usar el último `userLocalTime` calculado).
    const lastUserLocalTime = new Date(nowUTC.getTime() - (profiles[profiles.length-1].timezone_offset ?? 0) * 60 * 1000);
    const dateKey = lastUserLocalTime.toISOString().split('T')[0];

    // 4. Obtener todas las tareas no completadas para esos usuarios en su "hoy".
    const { data: todos, error: todayTodosError } = await supabaseAdmin
      .from('todos')
      .select('user_id')
      .in('user_id', usersToNotify)
      .eq('due_date', dateKey)
      .eq('completed', false);

    if (todayTodosError) throw todayTodosError;
    if (!todos || todos.length === 0) {
        // Aún así notificar a los usuarios que no tienen tareas.
        const usersWithNoTasks = usersToNotify.filter(uid => !todos.some(t => t.user_id === uid));
        const noTaskPromises = usersWithNoTasks.map(userId => {
             const title = "Tu resumen de hoy ☀️";
             const message = "¡Pío, pío! No tienes tareas para hoy. ¡Aprovecha para descansar o planificar algo nuevo!";
             return sendOneSignalNotification(userId, title, message);
        });
        await Promise.all(noTaskPromises);

        if (todos.length === 0) {
             return new Response(JSON.stringify({ message: "Se notificó a los usuarios que no tienen tareas para hoy." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }
    }

    // 5. Agrupar tareas por usuario y contarlas.
    const todosByUser = todos.reduce((acc, todo) => {
        if (!acc[todo.user_id]) acc[todo.user_id] = 0;
        acc[todo.user_id]++;
        return acc;
    }, {} as Record<string, number>);
    
    // 6. Formatear y enviar las notificaciones.
    const notificationPromises = Object.entries(todosByUser).map(([userId, taskCount]: [string, number]) => {
        if (taskCount === 0) return Promise.resolve(true);
        
        const title = "Tu resumen de hoy ☀️";
        const message = `¡Pío, pío! Tienes ${taskCount} tarea${taskCount > 1 ? 's' : ''} para hoy. ¡Que tengas un día productivo!`;
        
        return sendOneSignalNotification(userId, title, message);
    });
    
    await Promise.all(notificationPromises);

    return new Response(JSON.stringify({ message: `Resúmenes matutinos enviados a ${Object.keys(todosByUser).length} usuarios.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error("Error en la función morning-summary:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
