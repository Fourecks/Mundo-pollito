// supabase/functions/quick-add-task/index.ts

// ⚠️ DEPLOYMENT INSTRUCTION
// Deploy this function with the `--no-verify-jwt` flag to allow external calls without a user session.
// supabase functions deploy quick-add-task --no-verify-jwt

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';

// Helper to generate a styled HTML response page
const createHtmlResponse = (title: string, message: string, taskText?: string) => {
  const isError = title.includes('❌');
  const body = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Captura Rápida</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Fredoka', sans-serif; }
        @keyframes pop-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-pop-in { animation: pop-in 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
      </style>
    </head>
    <body class="bg-gradient-to-br from-amber-100 to-pink-100 flex items-center justify-center min-h-screen p-4">
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 text-center animate-pop-in max-w-sm w-full">
        <h1 class="text-2xl font-bold ${isError ? 'text-red-500' : 'text-pink-500'}">${title}</h1>
        <p class="mt-2 text-gray-600">${message}</p>
        ${taskText ? `<p class="mt-2 text-gray-800 font-semibold bg-gray-100 p-2 rounded-lg break-words">"${taskText}"</p>` : ''}
        <p class="mt-4 text-sm text-gray-500">Ya puedes cerrar esta ventana.</p>
      </div>
    </body>
    </html>
  `;
  return new Response(body, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
  });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('uid');
    const taskTextParam = url.searchParams.get('task');

    if (!userId) {
      return createHtmlResponse('❌ Error de Configuración', "Falta el ID de usuario en tu URL. Vuelve a copiar la 'URL Pollito' desde la app.");
    }
    if (!taskTextParam) {
      return createHtmlResponse('❌ Error en el Atajo', "No se recibió el texto de la tarea. Asegúrate de que la variable 'Entrada proporcionada' esté conectada a la URL en tu Atajo.");
    }

    const decodedText = decodeURIComponent(taskTextParam.replace(/\+/g, ' '));
    const dateKey = new Date().toISOString().split('T')[0];

    const { error } = await supabaseAdmin.from('todos').insert({
        text: decodedText,
        completed: false,
        priority: 'medium',
        due_date: dateKey,
        user_id: userId,
    });

    if (error) {
      console.error("Quick capture - Supabase insert error:", error);
      return createHtmlResponse('❌ Error al Guardar', `No se pudo guardar la tarea en la base de datos. Error: ${error.message}`);
    }

    return createHtmlResponse('✅ ¡Tarea Añadida!', "Se ha guardado tu nueva tarea:", decodedText);

  } catch (err) {
    console.error("Error en la función quick-add-task:", err);
    return createHtmlResponse('❌ Error Inesperado', `Ocurrió un problema en el servidor: ${err.message}`);
  }
});