// supabase/functions/rollover-ranged-tasks/index.ts

// ⚠️ INSTRUCCIONES DE DESPLIEGUE
// 1. Despliega esta función con el indicador `--no-verify-jwt` para permitir la ejecución por tarea programada (cron job).
//    supabase functions deploy rollover-ranged-tasks --no-verify-jwt
//
// 2. Programa un cron job en tu panel de Supabase para que se ejecute una vez al día.
//    Schedule: 0 0 * * * (Todos los días a la medianoche UTC)
//    Function: rollover-ranged-tasks

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const nowUTC = new Date();
    
    // 1. Obtener todos los perfiles con su ID y zona horaria.
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, timezone_offset');

    if (profileError) throw profileError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No user profiles found." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Agrupar usuarios por su desfase horario (timezone_offset).
    const profilesByOffset = new Map<number, string[]>();
    for (const profile of profiles) {
      const offset = profile.timezone_offset ?? 0; // Usar 0 (UTC) si no está definido
      if (!profilesByOffset.has(offset)) {
        profilesByOffset.set(offset, []);
      }
      profilesByOffset.get(offset)!.push(profile.id);
    }
    
    let totalUpdates = 0;

    // 3. Procesar cada grupo de zona horaria por separado.
    for (const [offset, userIds] of profilesByOffset.entries()) {
      // Calcular "hoy" y "ayer" para este grupo de usuarios.
      // El offset de JS es opuesto (positivo para zonas al oeste de UTC), por eso restamos.
      const userLocalNow = new Date(nowUTC.getTime() - offset * 60 * 1000);
      const todayKey = userLocalNow.toISOString().split('T')[0];
      
      // Clonar para no afectar el cálculo de 'todayKey'
      const userLocalYesterday = new Date(userLocalNow.getTime());
      userLocalYesterday.setUTCDate(userLocalYesterday.getUTCDate() - 1);
      const yesterdayKey = userLocalYesterday.toISOString().split('T')[0];
      
      // 4. Buscar tareas de "ayer" que no se completaron y cuyo rango aún no termina.
      const { data: tasksToUpdate, error: tasksError } = await supabaseAdmin
        .from('todos')
        .select('id')
        .in('user_id', userIds)
        .eq('due_date', yesterdayKey)
        .eq('completed', false)
        .not('end_date', 'is', null) // Asegurarse de que es una tarea con rango
        .gte('end_date', todayKey); // Asegurarse de que el rango no ha terminado

      if (tasksError) {
        console.error(`Error fetching tasks for offset ${offset}:`, tasksError);
        continue; // Continuar con el siguiente grupo
      }

      if (tasksToUpdate && tasksToUpdate.length > 0) {
        const idsToUpdate = tasksToUpdate.map(t => t.id);
        
        // 5. Mover la fecha de estas tareas a "hoy".
        const { error: updateError } = await supabaseAdmin
          .from('todos')
          .update({ due_date: todayKey })
          .in('id', idsToUpdate);

        if (updateError) {
          console.error(`Error updating tasks for offset ${offset}:`, updateError);
        } else {
          totalUpdates += idsToUpdate.length;
        }
      }
    }

    return new Response(JSON.stringify({ message: `Rollover complete. Updated ${totalUpdates} tasks.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error("Error in rollover-ranged-tasks function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
