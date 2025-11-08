// supabase/functions/inactivity-reminder/index.ts

// ⚠️ INSTRUCCIONES DE DESPLIEGUE
// 1. Despliega esta función con el indicador `--no-verify-jwt` para permitir la ejecución por tarea programada (cron job).
//    supabase functions deploy inactivity-reminder --no-verify-jwt
// 2. Programa un cron job en tu panel de Supabase para que se ejecute una vez al día.
//    Schedule: 0 17 * * * (Esto se ejecuta a las 5 PM UTC, una hora razonable para la mayoría de zonas horarias)
//    Function: inactivity-reminder

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
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    // 1. Obtener todos los usuarios.
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) throw error;
    
    // 2. Filtrar para encontrar usuarios cuya última actividad fue hace entre 3 y 4 días.
    // Esto crea una ventana de 24 horas para enviar un único recordatorio y evitar el spam.
    const inactiveUsers = users.filter(user => {
        if (!user.last_sign_in_at) return false; // Ignorar usuarios que nunca han iniciado sesión
        const lastSignIn = new Date(user.last_sign_in_at);
        return lastSignIn >= fourDaysAgo && lastSignIn < threeDaysAgo;
    });

    if (inactiveUsers.length === 0) {
      return new Response(JSON.stringify({ message: "No hay usuarios inactivos para recordar hoy." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // 3. Enviar una notificación a cada usuario inactivo.
    const notificationPromises = inactiveUsers.map(user => {
        const title = "¡Tu pollito te echa de menos! 🐣";
        const message = "¿Volvemos a organizar nuestras tareas juntos?";
        
        return sendOneSignalNotification(user.id, title, message);
    });
    
    await Promise.all(notificationPromises);
    
    return new Response(JSON.stringify({ message: `Se enviaron recordatorios de inactividad a ${inactiveUsers.length} usuarios.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error("Error en la función inactivity-reminder:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
