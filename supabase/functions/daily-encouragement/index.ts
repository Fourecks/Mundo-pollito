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
    const nowUTC = new Date();

    // 1. Fetch all profiles that have a timezone offset and ui_settings configured.
    const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id, ui_settings, timezone_offset')
        .not('ui_settings', 'is', null)
        .not('timezone_offset', 'is', null);
    
    if (error) throw error;
    
    if (!profiles || profiles.length === 0) {
        return new Response(JSON.stringify({ message: "No users have configured daily encouragement." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    
    const usersToNotify: string[] = [];
    
    // 2. Iterate over each user and check their local time.
    for (const profile of profiles) {
      // Safely access the nested property from the ui_settings JSONB column
      const preferredLocalHour = profile.ui_settings?.dailyEncouragementLocalHour;

      // Skip this user if the setting is not a valid number (0 is a valid hour)
      if (typeof preferredLocalHour !== 'number') {
        continue;
      }

      const userOffsetMinutes = profile.timezone_offset;
      
      // Calculate the user's current local time.
      // `timezone_offset` from JS `getTimezoneOffset` is positive for zones west of UTC.
      // So, local time = UTC time - offset.
      const userLocalTime = new Date(nowUTC.getTime() - userOffsetMinutes * 60 * 1000);
      
      // Use getUTCHours() on the calculated time to get the correct hour regardless of server's timezone.
      const currentLocalHour = userLocalTime.getUTCHours();
      
      if (currentLocalHour === preferredLocalHour) {
        usersToNotify.push(profile.id);
      }
    }
    
    if (usersToNotify.length === 0) {
      return new Response(JSON.stringify({ message: "No users to notify at this hour." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Send notifications.
    const notificationPromises = usersToNotify.map(userId => {
        const verse = verses[Math.floor(Math.random() * verses.length)];
        const title = 'Tu dosis de ánimo diario ☀️';
        const message = `Buenos días pollito.\n\n${verse.text} — ${verse.citation}`;
        
        return sendOneSignalNotification(userId, title, message);
    });
    
    await Promise.all(notificationPromises);
    
    return new Response(JSON.stringify({ message: `Sent daily encouragement to ${usersToNotify.length} users.` }), {
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