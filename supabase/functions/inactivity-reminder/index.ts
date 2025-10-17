
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { sendNotification } from '../_shared/onesignal.ts';

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
