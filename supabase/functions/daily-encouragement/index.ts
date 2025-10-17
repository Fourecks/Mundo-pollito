
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { sendNotification } from '../_shared/onesignal.ts';
import { verses } from '../_shared/verses.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const currentUTCHour = new Date().getUTCHours();

    const { data: settings, error } = await supabaseAdmin
      .from('site_settings')
      .select('user_id')
      .eq('daily_encouragement_utc_hour', currentUTCHour);
    
    if (error) throw error;

    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ message: `No users scheduled for UTC hour ${currentUTCHour}.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const userIds = settings.map(s => s.user_id);
    const verse = verses[Math.floor(Math.random() * verses.length)];

    await sendNotification({
      userIds,
      title: 'Tu Dosis de Ánimo Diario 💌',
      body: `"${verse.text}" - ${verse.citation}`,
    });
    
    return new Response(JSON.stringify({ success: true, usersNotified: userIds.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Error in daily-encouragement cron function:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
