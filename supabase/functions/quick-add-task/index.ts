// supabase/functions/quick-add-task/index.ts

// ⚠️ DEPLOYMENT INSTRUCTION
// Deploy this function with the `--no-verify-jwt` flag to allow external calls without a user session.
// supabase functions deploy quick-add-task --no-verify-jwt

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';

// Helper to generate a self-contained, styled HTML response page.
const createHtmlResponse = (title: string, message: string, taskText?: string) => {
  const isError = title.includes('❌');

  // Sanitize user-provided taskText to prevent any potential XSS.
  const safeTaskText = taskText?.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

  const body = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Captura R&aacute;pida</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;700&display=swap');
        
        :root {
          color-scheme: light;
        }

        body {
          font-family: 'Fredoka', sans-serif;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 1rem;
          background: linear-gradient(to bottom right, #FEF3C7, #FBCFE8);
        }
        
        .card {
          background-color: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          border-radius: 1.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          padding: 2rem;
          text-align: center;
          max-width: 24rem;
          width: 100%;
          animation: pop-in 0.3s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
        }

        @keyframes pop-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .title {
          font-size: 1.5rem;
          line-height: 2rem;
          font-weight: 700;
          color: ${isError ? '#EF4444' : '#EC4899'};
        }
        
        .message {
          margin-top: 0.5rem;
          color: #4B5563;
        }
        
        .task-text {
          margin-top: 0.5rem;
          color: #1F2937;
          font-weight: 600;
          background-color: #F3F4F6;
          padding: 0.5rem;
          border-radius: 0.5rem;
          word-break: break-word;
        }
        
        .footer-text {
          margin-top: 1rem;
          font-size: 0.875rem;
          line-height: 1.25rem;
          color: #6B7280;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h1 class="title">${title}</h1>
        <p class="message">${message}</p>
        ${safeTaskText ? `<p class="task-text">"${safeTaskText}"</p>` : ''}
        <p class="footer-text">Ya puedes cerrar esta ventana.</p>
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

    console.log(`[quick-add-task] Received request. UID: ${userId}, Task Param: ${taskTextParam}`);

    if (!userId) {
      return createHtmlResponse('❌ Error de Configuración', "Falta el ID de usuario en tu URL. Vuelve a copiar la 'URL Pollito' desde la app.");
    }
    if (!taskTextParam) {
      return createHtmlResponse('❌ Error en el Atajo', "No se recibió el texto de la tarea. Asegúrate de que la variable 'Entrada proporcionada' esté conectada a la URL en tu Atajo.");
    }

    const decodedText = decodeURIComponent(taskTextParam.replace(/\+/g, ' '));
    const dateKey = new Date().toISOString().split('T')[0];

    console.log(`[quick-add-task] Inserting for user ${userId}: "${decodedText}" on date ${dateKey}`);

    const { data, error } = await supabaseAdmin
      .from('todos')
      .insert([{
          text: decodedText,
          completed: false,
          priority: 'medium',
          due_date: dateKey,
          user_id: userId,
      }])
      .select()
      .single();

    if (error || !data) {
      console.error("[quick-add-task] Supabase insert error:", error);
      const errorMessage = error ? error.message : "La base de datos no confirmó el guardado.";
      return createHtmlResponse('❌ Error al Guardar', `No se pudo guardar la tarea. Error: ${errorMessage}`);
    }
    
    console.log(`[quick-add-task] Successfully inserted new todo with ID: ${data.id}`);
    return createHtmlResponse('✅ ¡Tarea Añadida!', "Se ha guardado tu nueva tarea:", decodedText);

  } catch (err) {
    console.error("[quick-add-task] Critical function error:", err);
    return createHtmlResponse('❌ Error Inesperado', `Ocurrió un problema en el servidor: ${err.message}`);
  }
});