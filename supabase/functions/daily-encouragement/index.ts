// supabase/functions/daily-encouragement/index.ts

// ⚠️ DEPLOYMENT INSTRUCTION
// Deploy this function with the `--no-verify-jwt` flag to allow cron job execution.
// supabase functions deploy daily-encouragement --no-verify-jwt

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabase-admin.ts';
import { sendOneSignalNotification } from '../_shared/onesignal.ts';
import { verses } from '../_shared/verses.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const now = new Date();
    const currentUTCHour = now.getUTCHours();

    // Find users who have opted in for a notification at the current UTC hour.
    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('daily_encouragement_hour_utc', currentUTCHour);
    
    if (error) throw error;
    
    if (!profiles || profiles.length === 0) {
        return new Response(JSON.stringify({ message: `No users to notify at UTC hour ${currentUTCHour}.` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    
    const notificationPromises = profiles.map(profile => {
        // Select a random verse for each user
        const verse = verses[Math.floor(Math.random() * verses.length)];
        const title = 'Tu dosis de ánimo diario ☀️';
        const message = `${verse.text} — ${verse.citation}`;
        
        return sendOneSignalNotification(profile.id, title, message);
    });
    
    await Promise.all(notificationPromises);
    
    return new Response(JSON.stringify({ message: `Sent daily encouragement to ${profiles.length} users.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error("Error in daily-encouragement function:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
