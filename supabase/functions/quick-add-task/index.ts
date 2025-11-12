// supabase/functions/quick-add-task/index.ts

// ⚠️ DEPLOYMENT INSTRUCTION
// Deploy this function with the `--no-verify-jwt` flag to allow external calls without a user session.
// supabase functions deploy quick-add-task --no-verify-jwt

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('uid');
    const taskText = url.searchParams.get('task');

    if (!userId) {
      throw new Error("El parámetro 'uid' (ID de usuario) es requerido.");
    }
    if (!taskText) {
      throw new Error("El parámetro 'task' (texto de la tarea) es requerido.");
    }
    
    const decodedText = decodeURIComponent(taskText.replace(/\+/g, ' '));
    const dateKey = new Date().toISOString().split('T')[0];

    const newTodo = {
        text: decodedText,
        completed: false,
        priority: 'medium',
        due_date: dateKey,
        user_id: userId,
    };

    const { error } = await supabaseAdmin.from('todos').insert(newTodo);

    if (error) {
      console.error("Quick capture - Supabase insert error:", error);
      throw new Error(`Error de Supabase al insertar: ${error.message}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Tarea añadida con éxito." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error("Error en la función quick-add-task:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Bad Request for missing params or other client errors
    });
  }
});
