import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- INLINED SHARED CODE ---

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

declare const Deno: any;

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface NotificationPayload {
  title: string;
  body: string;
  userIds: string[];
}

async function sendNotification(payload: NotificationPayload): Promise<void> {
  const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
  const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    throw new Error("OneSignal secrets (ONESIGNAL_APP_ID, ONESIGNAL_REST_API_KEY) are not configured.");
  }

  const notification = {
    app_id: ONESIGNAL_APP_ID,
    contents: { en: payload.body },
    headings: { en: payload.title },
    include_external_user_ids: payload.userIds,
  };

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(notification),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("OneSignal API Error:", errorData);
    throw new Error(`Failed to send notification: ${errorData.errors?.join(', ') || 'Unknown error'}`);
  }
}

// --- ORIGINAL FUNCTION LOGIC ---

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
