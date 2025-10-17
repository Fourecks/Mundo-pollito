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
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    
    // Note: listUsers() paginates. For a large user base, you'd need to loop through pages.
    // This implementation assumes a user count under the default page limit (50).
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const inactiveUsers = users.filter(user => 
        user.last_sign_in_at && user.last_sign_in_at < threeDaysAgo
    );
    
    if (inactiveUsers.length === 0) {
      return new Response(JSON.stringify({ message: 'No inactive users found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIds = inactiveUsers.map(u => u.id);
    await sendNotification({
        userIds,
        title: '¡Pío, pío! 👋',
        body: 'Pollito te echa de menos. ¿Hay alguna tarea nueva que quieras organizar juntos?',
    });

    return new Response(JSON.stringify({ success: true, usersNotified: userIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error in inactivity-reminder cron function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
