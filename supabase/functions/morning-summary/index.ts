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

    // 1. Obtener todos los perfiles con una zona horaria configurada.
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, timezone_offset')
      .not('timezone_offset', 'is', null);

    if (profileError) {
      console.error("Error al obtener perfiles por zona horaria. ¿Existe la columna 'timezone_offset' en la tabla 'profiles'?", profileError);
      throw profileError;
    }

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: `No se encontraron perfiles con zona horaria configurada.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const usersToNotify: string[] = [];

    // 2. Iterar sobre cada perfil para verificar si son las 5 AM en su hora local.
    for (const profile of profiles) {
      // El offset de getTimezoneOffset() es opuesto al estándar (ej. UTC-5 es +300). El nuestro está bien.
      const userOffsetMinutes = profile.timezone_offset;
      const userLocalTime = new Date(nowUTC.getTime() - userOffsetMinutes * 60 * 1000);
      
      // La función cron se ejecuta a HH:30 UTC. Usamos getUTCHours() en la hora local calculada
      // para evitar problemas con el horario de verano del servidor.
      if (userLocalTime.getUTCHours() === 5) {
        usersToNotify.push(profile.id);
      }
    }

    if (usersToNotify.length === 0) {
        return new Response(JSON.stringify({ message: "No hay usuarios en la zona horaria de las 5 AM en este momento." }), {
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
      .select('user_id, text')
      .in('user_id', usersToNotify)
      .eq('due_date', dateKey)
      .eq('completed', false);

    if (todayTodosError) throw todayTodosError;
    if (!todos || todos.length === 0) {
        return new Response(JSON.stringify({ message: "No se encontraron tareas para hoy para los usuarios seleccionados." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 5. Agrupar tareas por usuario.
    const todosByUser = todos.reduce((acc, todo) => {
        if (!acc[todo.user_id]) acc[todo.user_id] = [];
        acc[todo.user_id].push(todo.text);
        return acc;
    }, {} as Record<string, string[]>);
    
    // 6. Formatear y enviar las notificaciones.
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
